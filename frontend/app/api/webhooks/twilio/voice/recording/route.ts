/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Recording Status Webhook
 * Called when a voicemail recording is ready
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formDataToParams } from "@/lib/twilio-webhook";
import { notifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const log = logger.child({ handler: "recording-status" });
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");

  try {
    const form = await request.formData();
    const params = formDataToParams(form);

    const recordingUrl = params["RecordingUrl"] ?? "";
    const recordingSid = params["RecordingSid"] ?? "";
    const callSid = params["CallSid"] ?? "";
    const recordingDuration = parseInt(params["RecordingDuration"] ?? "0", 10);

    log.info("Recording received", { 
      recordingSid, 
      callSid, 
      duration: recordingDuration,
      leadId 
    });

    // Update call record with recording
    if (callSid) {
      await prisma.call.updateMany({
        where: { twilioCallSid: callSid },
        data: {
          recordingUrl: recordingUrl,
          recordingSid: recordingSid,
          duration: recordingDuration,
          status: "voicemail",
        },
      });
    }

    // If we have a lead, add a note
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { assignedTo: true },
      });

      if (lead) {
        // Add interaction for the voicemail
        await prisma.interaction.create({
          data: {
            contactId: lead.contactId,
            channel: "TWILIO",
            direction: "INBOUND",
            body: `Voicemail received (${recordingDuration}s): ${recordingUrl}`,
            externalId: recordingSid,
          },
        });

        // Notify assigned agent
        if (lead.assignedTo) {
          await notifications.send(`user:${lead.assignedTo.id}`, {
            type: "new_message",
            title: "New Voicemail",
            message: `${recordingDuration} second voicemail from lead`,
            data: { leadId, recordingUrl, recordingSid },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Recording webhook error", {}, err as Error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
