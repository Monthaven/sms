/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS, type SMSProvider } from "@/lib/sms";
import { logger, generateRequestId } from "@/lib/logger";
import { randomUUID } from "crypto";

// Default SMS provider for sequence messages - can be overridden per sequence
const DEFAULT_SMS_PROVIDER: SMSProvider = (process.env.DEFAULT_SMS_PROVIDER as SMSProvider) || "twilio";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/cron/process-sequences", requestId });
  
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    log.warn("Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  log.info("Starting sequence processing");
  const startTime = Date.now();

  try {
    // Find contacts ready to send
    const ready = await prisma.sequenceContact.findMany({
      where: { 
        status: "active", 
        next_send_at: { lte: new Date() } 
      },
      include: {
        Sequence: { 
          include: { 
            SequenceStep: { orderBy: { stepNumber: "asc" } } 
          } 
        },
      },
    });

    log.info("Found contacts to process", { count: ready.length });

    let sent = 0;
    let paused = 0;
    let completed = 0;
    let errors = 0;

    for (const sc of ready) {
      try {
        // Fetch contact separately (no relation defined)
        const contact = await prisma.contact.findFirst({
          where: { id: sc.contact_id },
        });

        if (!contact) {
          log.warn("Contact not found", { contactId: sc.contact_id });
          continue;
        }

        // Check for recent reply since enrollment
        const recentReply = await prisma.interaction.findFirst({
          where: {
            contactId: sc.contact_id,
            direction: "INBOUND",
            createdAt: { gte: sc.enrolled_at ?? new Date(0) },
          },
        });

        if (recentReply) {
          await prisma.sequenceContact.update({
            where: { id: sc.id },
            data: { status: "paused" },
          });
          paused += 1;
          log.debug("Contact paused due to reply", { contactId: sc.contact_id });
          continue;
        }

        // Get current step (steps are 1-indexed, current_step tracks last completed)
        const currentStepNum = (sc.current_step ?? 0) + 1;
        const step = sc.Sequence.SequenceStep.find(
          (s) => s.stepNumber === currentStepNum
        );

        if (!step) {
          // No more steps - mark complete
          await prisma.sequenceContact.update({
            where: { id: sc.id },
            data: { status: "completed" },
          });
          completed += 1;
          log.debug("Sequence completed", { contactId: sc.contact_id, sequenceId: sc.sequence_id });
          continue;
        }

        // Render template
        const message = step.template
          .replace(/{firstName}/g, contact.firstName || "")
          .replace(/{lastName}/g, contact.lastName || "");

        // Send SMS
        if (contact.phoneE164) {
          // Use sequence-specific provider or default
          const provider = (sc.Sequence as any).smsProvider || DEFAULT_SMS_PROVIDER;
          
          const result = await sendSMS({
            to: contact.phoneE164,
            message,
            provider,
          });

          if (!result.success) {
            log.error("SMS send failed", { error: result.error, contactId: sc.contact_id });
            errors += 1;
            continue;
          }

          // Log interaction with the channel used
          await prisma.interaction.create({
            data: {
              id: randomUUID(),
              contactId: sc.contact_id,
              channel: provider.toUpperCase() as "TWILIO" | "EZTEXTING",
              direction: "OUTBOUND",
              body: message,
              externalId: result.externalId,
            },
          });

          sent += 1;
        }

        // Calculate next send time
        const nextStepNum = currentStepNum + 1;
        const nextStep = sc.Sequence.SequenceStep.find(
          (s) => s.stepNumber === nextStepNum
        );
        
        const nextSendAt = nextStep && nextStep.delayDays
          ? new Date(Date.now() + nextStep.delayDays * 24 * 60 * 60 * 1000)
          : null;

        // Update progress
        await prisma.sequenceContact.update({
          where: { id: sc.id },
          data: {
            current_step: currentStepNum,
            last_sent_at: new Date(),
            next_send_at: nextSendAt,
            status: nextStep ? "active" : "completed",
          },
        });

        if (!nextStep) completed += 1;
      } catch (contactError: any) {
        log.error("Error processing contact", { contactId: sc.contact_id }, contactError);
        errors += 1;
      }
    }

    const duration = Date.now() - startTime;
    log.info("Sequence processing completed", { 
      processed: ready.length, 
      sent, 
      paused, 
      completed,
      errors,
      durationMs: duration 
    });

    return NextResponse.json({
      processed: ready.length,
      sent,
      paused,
      completed,
      errors,
      durationMs: duration,
    });
  } catch (error: any) {
    log.error("Sequence processing failed", {}, error);
    return NextResponse.json(
      { error: "Sequence processing failed" },
      { status: 500 }
    );
  }
}
