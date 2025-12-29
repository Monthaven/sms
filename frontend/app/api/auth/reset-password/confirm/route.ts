/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Password Reset Confirmation API - Verify token and set new password
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";
import crypto from "crypto";

const confirmSchema = z.object({
  token: z.string().min(1, "Token is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/auth/reset-password/confirm", requestId });

  try {
    const body = await req.json();
    const validation = confirmSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { token, email, password } = validation.data;

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user and check token
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      log.warn("Reset attempt for non-existent user");
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    // Check token from settings
    const settings = (user.settings as Record<string, any>) || {};
    const storedHash = settings.resetTokenHash;
    const resetExpires = settings.resetExpires ? new Date(settings.resetExpires) : null;

    if (!storedHash || storedHash !== tokenHash) {
      log.warn("Invalid reset token", { userId: user.id });
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    if (!resetExpires || resetExpires < new Date()) {
      log.warn("Expired reset token", { userId: user.id });
      return NextResponse.json(
        { error: "Reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user with new password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        loginAttempts: 0,
        lockedUntil: null,
        settings: {
          ...settings,
          resetTokenHash: null,
          resetExpires: null,
        },
      },
    });

    log.info("Password reset successful", { userId: user.id });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now sign in.",
    });
  } catch (error: any) {
    log.error("Password reset confirmation error", { error: error.message });
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
