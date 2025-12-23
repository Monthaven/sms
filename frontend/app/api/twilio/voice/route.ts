import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/db";

const VoiceResponse = twilio.twiml.VoiceResponse;

async function buildResponse(params: URLSearchParams | FormData) {
  const to = (params instanceof URLSearchParams ? params.get("to") : (params.get("To") as string | null)) || "";
  const callId = params instanceof URLSearchParams ? params.get("callId") : (params.get("CallId") as string | null);
  const callSid = params instanceof URLSearchParams ? undefined : (params.get("CallSid") as string | null);

  if (callId && callSid) {
    await prisma.call.updateMany({
      where: { id: callId },
      data: { twilioCallSid: callSid, status: "RINGING" },
    });
  }

  const response = new VoiceResponse();

  if (!to) {
    response.say("Missing destination number.");
    response.hangup();
  } else {
    response.dial({
      callerId: process.env.TWILIO_MAIN_FROM || process.env.TWILIO_FROM_NUMBER,
      record: "record-from-answer",
      recordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice/status`,
      recordingStatusCallbackMethod: "POST",
    }).number({}, to);
  }

  return response.toString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const twiml = await buildResponse(url.searchParams);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const twiml = await buildResponse(form);
  return new NextResponse(twiml, { headers: { "Content-Type": "text/xml" } });
}
