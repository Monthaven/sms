/**
 * PROPRIETARY — Always Improving LLC
 * Transcription Webhook - Receives voicemail transcriptions from Twilio
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateTwilioWebhook, formDataToParams } from "@/lib/twilio-webhook";
import { logger, generateRequestId } from "@/lib/logger";
import { classifyIntent } from "@/lib/intent-classifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/twilio/voice/transcription", requestId });

  try {
    const form = await req.formData();
    const params = formDataToParams(form);

    // Validate Twilio signature
    const signatureValidation = validateTwilioWebhook(req, params);
    if (!signatureValidation.valid) {
      log.warn("Invalid Twilio signature for transcription");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const transcriptionText = params["TranscriptionText"] || "";
    const transcriptionSid = params["TranscriptionSid"] || "";
    const recordingSid = params["RecordingSid"] || "";
    const callSid = params["CallSid"] || "";

    log.info("Transcription received", { 
      transcriptionSid, 
      recordingSid,
      textLength: transcriptionText.length 
    });

    if (!transcriptionText) {
      log.warn("Empty transcription received");
      return NextResponse.json({ success: true, message: "No transcription text" });
    }

    // Find the call by recording SID or call SID
    const call = await prisma.call.findFirst({
      where: {
        OR: [
          { recordingSid },
          { twilioCallSid: callSid },
        ],
      },
      include: {
        contact: true,
        lead: true,
      },
    });

    if (!call) {
      log.warn("Call not found for transcription", { recordingSid, callSid });
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    // Classify intent from transcription
    const intentResult = classifyIntent(transcriptionText);
    log.info("Voicemail intent classified", { intent: intentResult.intent, callId: call.id });

    // Update call with transcription
    await prisma.call.update({
      where: { id: call.id },
      data: {
        transcription: transcriptionText,
      },
    });

    // If contact exists, update their intent
    if (call.contact) {
      await prisma.contact.update({
        where: { id: call.contact.id },
        data: {
          intent: intentResult.intent,
          intentSource: "VOICEMAIL_TRANSCRIPTION",
        },
      });
    }

    // If HOT intent, create high-priority notification
    if (intentResult.intent === "HOT" && call.lead) {
      const onlineManagers = await prisma.user.findMany({
        where: {
          role: { in: ["MANAGER", "ADMIN"] },
          isOnline: true,
        },
        select: { id: true },
      });

      const callerName = call.contact
        ? `${call.contact.firstName || ""} ${call.contact.lastName || ""}`.trim() || call.fromNumber
        : call.fromNumber;

      for (const manager of onlineManagers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            type: "LEAD_HOT",
            priority: "CRITICAL",
            title: `🔥 Hot Voicemail: ${callerName}`,
            body: transcriptionText.substring(0, 100) + (transcriptionText.length > 100 ? "..." : ""),
            actionUrl: `/dashboard/chat/${call.lead.id}`,
            actionLabel: "View Lead",
            relatedType: "Lead",
            relatedId: call.lead.id,
          },
        });
      }

      // Update lead status to HOT
      await prisma.lead.update({
        where: { id: call.lead.id },
        data: { status: "RESP_HOT" },
      });
    }

    return NextResponse.json({ 
      success: true, 
      intent: intentResult.intent,
      callId: call.id,
    });
  } catch (error: any) {
    log.error("Transcription handler error", { error: error.message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
