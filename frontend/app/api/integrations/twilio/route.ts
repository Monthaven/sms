/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { evaluateTwilioStatus } from "@/lib/integrations";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const twilioStatus = evaluateTwilioStatus();
  return NextResponse.json(twilioStatus);
}
