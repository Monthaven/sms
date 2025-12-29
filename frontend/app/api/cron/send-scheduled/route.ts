/**
 * PROPRIETARY — Always Improving LLC
 * Scheduled Message Processor - Cron Job
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/sms";
import { checkQuietHours } from "@/lib/quiet-hours";
import { logger, generateRequestId } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for processing

// Verify cron secret for Vercel Cron
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/cron/send-scheduled", requestId });

  // Verify cron secret if configured
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    log.warn("Unauthorized cron attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const stats = {
    processed: 0,
    sent: 0,
    failed: 0,
    rescheduled: 0,
    skippedDnc: 0,
    skippedQuietHours: 0,
  };

  try {
    // Fetch scheduled messages ready to send
    const messages = await prisma.scheduledMessage.findMany({
      where: {
        status: "PENDING",
        scheduledAt: {
          lte: new Date(),
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            phoneE164: true,
            doNotContact: true,
            phoneValid: true,
          },
        },
        lead: {
          select: {
            campaignId: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 100, // Process in batches
      orderBy: {
        scheduledAt: "asc",
      },
    });

    log.info(`Processing ${messages.length} scheduled messages`);

    for (const message of messages) {
      stats.processed++;

      // Skip if contact opted out (doNotContact flag)
      if (message.contact.doNotContact) {
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: "CANCELLED",
            error: "Contact opted out",
          },
        });
        stats.skippedDnc++;
        continue;
      }

      // Skip if phone invalid
      if (!message.contact.phoneValid) {
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: "CANCELLED",
            error: "Invalid phone number",
          },
        });
        stats.skippedDnc++;
        continue;
      }

      // Check DNC list
      const isDnc = await prisma.dncEntry.findFirst({
        where: {
          phone: message.contact.phoneE164,
        },
      });

      if (isDnc) {
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: { 
            status: "CANCELLED",
            error: "Number on DNC list",
          },
        });
        stats.skippedDnc++;
        continue;
      }

      // Check quiet hours (use undefined for state since it's not on Contact)
      const quietCheck = checkQuietHours(
        undefined, // state not available on Contact model
        undefined // timezone not available on Contact model
      );

      if (!quietCheck.allowed) {
        // Reschedule for next allowed window
        if (quietCheck.nextAllowedTime) {
          await prisma.scheduledMessage.update({
            where: { id: message.id },
            data: {
              scheduledAt: quietCheck.nextAllowedTime,
            },
          });
          stats.skippedQuietHours++;
          continue;
        }
      }

      // Attempt to send
      try {
        const result = await sendSMS({
          to: message.contact.phoneE164,
          message: message.body,
          provider: "twilio",
          mediaUrls: message.mediaUrls.length > 0 ? message.mediaUrls : undefined,
          leadId: message.leadId || undefined,
        });

        if (!result.success) {
          throw new Error(result.error || "SMS send failed");
        }

        // Update scheduled message as sent
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
          },
        });

        // Create message record
        await prisma.message.create({
          data: {
            id: crypto.randomUUID(),
            phone: message.contact.phoneE164,
            direction: "outbound",
            body: message.body,
            status: "sent",
            provider: "twilio",
            external_id: result.externalId,
            campaign_id: message.lead?.campaignId || null,
            contactId: message.contact.id,
            updatedAt: new Date(),
          },
        });

        stats.sent++;
        log.info("Scheduled message sent", { 
          messageId: message.id, 
          contactId: message.contact.id,
        });

      } catch (sendError: any) {
        // On failure, mark as failed
        await prisma.scheduledMessage.update({
          where: { id: message.id },
          data: {
            status: "FAILED",
            error: sendError.message,
          },
        });
        stats.failed++;

        log.error("Failed to send scheduled message", { 
          messageId: message.id, 
          error: sendError.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    log.info("Scheduled message processing complete", { stats, duration });

    return NextResponse.json({
      success: true,
      stats,
      duration,
    });

  } catch (error: any) {
    log.error("Cron job failed", { error: error.message });
    return NextResponse.json({ 
      error: "Processing failed", 
      message: error.message,
    }, { status: 500 });
  }
}
