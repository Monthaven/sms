/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const url = new URL(req.url);
  const callId = url.searchParams.get("callId");
  if (!callId) {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Missing callId" } }, { status: 400 });
  }
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { status: true, duration: true },
  });
  if (!call) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Call not found" } }, { status: 404 });
  }
  return NextResponse.json({ success: true, status: call.status, duration: call.duration });
}
