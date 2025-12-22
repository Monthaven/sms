/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find contacts ready to send
  const ready = await prisma.sequenceContact.findMany({
    where: { 
      status: "active", 
      next_send_at: { lte: new Date() } 
    },
    include: {
      Sequence: { 
        include: { 
          steps: { orderBy: { stepNumber: "asc" } } 
        } 
      },
    },
  });

  let sent = 0;
  let paused = 0;
  let completed = 0;

  for (const sc of ready) {
    // Fetch contact separately (no relation defined)
    const contact = await prisma.contact.findFirst({
      where: { id: sc.contact_id },
    });

    if (!contact) {
      console.warn(`Contact not found for id: ${sc.contact_id}`);
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
      continue;
    }

    // Get current step (steps are 1-indexed, current_step tracks last completed)
    const currentStepNum = (sc.current_step ?? 0) + 1;
    const step = sc.Sequence.steps.find(
      (s) => s.stepNumber === currentStepNum
    );

    if (!step) {
      // No more steps - mark complete
      await prisma.sequenceContact.update({
        where: { id: sc.id },
        data: { status: "completed" },
      });
      completed += 1;
      continue;
    }

    // Render template
    const message = step.template
      .replace(/{firstName}/g, contact.firstName || "")
      .replace(/{lastName}/g, contact.lastName || "");

    // Send SMS
    if (contact.phoneE164) {
      try {
        await sendSMS(contact.phoneE164, message);

        // Log interaction
        await prisma.interaction.create({
          data: {
            contactId: sc.contact_id,
            channel: "TWILIO",
            direction: "OUTBOUND",
            body: message,
          },
        });

        sent += 1;
      } catch (err) {
        console.error("Send failed:", err);
        continue;
      }
    }

    // Calculate next send time
    const nextStepNum = currentStepNum + 1;
    const nextStep = sc.Sequence.steps.find(
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
  }

  return NextResponse.json({
    processed: ready.length,
    sent,
    paused,
    completed,
  });
}
