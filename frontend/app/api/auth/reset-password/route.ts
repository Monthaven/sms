/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Password Reset API - Request password reset token
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";
import crypto from "crypto";

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/auth/reset-password", requestId });

  try {
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    log.info("Password reset requested", { email: email.substring(0, 3) + "***" });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      log.info("Reset requested for non-existent email");
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a reset link.",
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store hashed token in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Store in settings JSON field since we don't have dedicated columns
        settings: {
          ...(typeof user.settings === 'object' ? user.settings : {}),
          resetTokenHash,
          resetExpires: resetExpires.toISOString(),
        },
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email (using simple fetch to email API or log for now)
    // In production, integrate with SendGrid/Resend/etc.
    if (process.env.SENDGRID_API_KEY) {
      try {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email }] }],
            from: { 
              email: process.env.FROM_EMAIL || "noreply@monthavengroup.com",
              name: "Monthaven Acquisition Engine"
            },
            subject: "Reset Your Password",
            content: [
              {
                type: "text/html",
                value: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e293b;">Password Reset Request</h2>
                    <p>You requested a password reset for your Monthaven account.</p>
                    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                    <div style="margin: 30px 0;">
                      <a href="${resetUrl}" 
                         style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                                text-decoration: none; border-radius: 6px; display: inline-block;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #64748b; font-size: 14px;">
                      If you didn't request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                    <p style="color: #94a3b8; font-size: 12px;">
                      Monthaven Acquisition Engine<br />
                      This is an automated message, please do not reply.
                    </p>
                  </div>
                `,
              },
            ],
          }),
        });
        log.info("Password reset email sent", { userId: user.id });
      } catch (emailError) {
        log.error("Failed to send reset email", { error: emailError });
        // Don't fail the request if email fails
      }
    } else {
      // Development: log the reset URL
      log.info("Password reset URL (dev mode)", { resetUrl });
      console.log("\n🔐 PASSWORD RESET URL:", resetUrl, "\n");
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a reset link.",
    });
  } catch (error: any) {
    log.error("Password reset error", { error: error.message });
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
