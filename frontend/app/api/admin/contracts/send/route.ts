/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initiateContractSigning } from "@/lib/contracts";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: { message: "User ID required" } }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      contractEnvelopeId: true,
      contractSignedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
  }

  if (!user.email) {
    return NextResponse.json({ error: { message: "User has no email address" } }, { status: 400 });
  }

  if (user.contractSignedAt) {
    return NextResponse.json({ error: { message: "Contract already signed" } }, { status: 400 });
  }

  try {
    // Send contract via DocuSign
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const result = await initiateContractSigning({
      userId: user.id,
      userEmail: user.email,
      userName: user.name || "Unknown",
      contractType: "CALLER_AGREEMENT",
      returnUrl: `${baseUrl}/api/admin/contracts/callback`,
    });

    // Update user with envelope ID
    await prisma.user.update({
      where: { id: userId },
      data: { contractEnvelopeId: result.envelopeId },
    });

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      signingUrl: result.signingUrl,
    });
  } catch (error) {
    logger.error("Failed to send contract", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: { message: "Failed to send contract" } },
      { status: 500 }
    );
  }
}
