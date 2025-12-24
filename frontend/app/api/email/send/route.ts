/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { withRetry } from "@/lib/retry";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Email request validation
const emailRequestSchema = z.object({
  to: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required").max(50000),
  leadId: z.string().optional(),
  replyTo: z.string().email().optional(),
});

/**
 * Send email via configured provider (Resend, SendGrid, or SMTP)
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, body, replyTo } = params;

  // Try Resend first (recommended for modern apps)
  if (process.env.RESEND_API_KEY) {
    return sendViaResend(to, subject, body, replyTo);
  }

  // Try SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return sendViaSendGrid(to, subject, body, replyTo);
  }

  // Fallback: log and simulate (development mode)
  if (process.env.NODE_ENV === "development") {
    logger.info("Email simulated (no provider configured)", { to, subject });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  return { success: false, error: "No email provider configured" };
}

/**
 * Send via Resend API
 */
async function sendViaResend(
  to: string,
  subject: string,
  body: string,
  replyTo?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "noreply@monthavencapital.com";

  return withRetry(async () => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html: body,
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Resend API error: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  }, { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 3000, backoffMultiplier: 2 });
}

/**
 * Send via SendGrid API
 */
async function sendViaSendGrid(
  to: string,
  subject: string,
  body: string,
  replyTo?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "noreply@monthavencapital.com";

  return withRetry(async () => {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail },
        subject,
        content: [{ type: "text/html", value: body }],
        reply_to: replyTo ? { email: replyTo } : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${errorText || response.status}`);
    }

    // SendGrid returns 202 with no body on success
    const messageId = response.headers.get("x-message-id") || `sg_${Date.now()}`;
    return { success: true, messageId };
  }, { maxRetries: 2, initialDelayMs: 500, maxDelayMs: 3000, backoffMultiplier: 2 });
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  const log = logger.child({ endpoint: "/api/email/send", clientIP });

  // Auth check
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(`email_send:${clientIP}`, RATE_LIMITS.SMS_SEND);
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded for email send");
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rateLimit) }
    );
  }

  try {
    const rawBody = await request.json();
    
    // Validate input
    const validation = emailRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      log.warn("Email validation failed", { error: errors });
      return NextResponse.json(
        { error: errors },
        { status: 400, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { to, subject, body: emailBody, leadId, replyTo } = validation.data;

    // Send the email
    const result = await sendEmail({ to, subject, body: emailBody, replyTo });

    if (!result.success) {
      log.error("Email send failed", { error: result.error });
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Log interaction if leadId provided
    if (leadId) {
      try {
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          select: { contactId: true },
        });

        if (lead) {
          // Log as audit entry (EMAIL channel could be added to Interaction model)
          await prisma.leadAudit.create({
            data: {
              leadId: leadId,
              action: "EMAIL_SENT",
              details: `Email sent to ${to}: ${subject} (ID: ${result.messageId})`,
              updatedAt: new Date(),
            },
          });
        }
      } catch (dbError) {
        // Don't fail the request if logging fails
        log.warn("Failed to log email interaction", { leadId }, dbError as Error);
      }
    }

    log.info("Email sent successfully", { to, messageId: result.messageId });
    return NextResponse.json(
      {
        success: true,
        messageId: result.messageId,
      },
      { headers: rateLimitHeaders(rateLimit) }
    );
  } catch (error: any) {
    log.error("Email send error", {}, error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
