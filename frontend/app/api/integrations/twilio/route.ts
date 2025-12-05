import { NextResponse } from "next/server";
import { evaluateTwilioStatus } from "@/lib/integrations";

export async function GET() {
  const twilioStatus = evaluateTwilioStatus();
  return NextResponse.json(twilioStatus);
}
