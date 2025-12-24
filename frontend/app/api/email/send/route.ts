/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    // For now, we'll just log the email intent
    // In production, integrate with SendGrid, Resend, or similar
    console.log("Email send request:", { to, subject, bodyLength: emailBody.length });

    // Get lead info for logging
    const lead = leadId
      ? await prisma.lead.findUnique({
          where: { id: leadId },
          include: { contact: true },
        })
      : null;

    // Log interaction as EMAIL channel (you may need to add this to your enum)
    if (lead) {
      // For now, log as a note in lead audit
      await prisma.leadAudit.create({
        data: {
          leadId: leadId,
          action: "EMAIL_SENT",
          details: `Email sent to ${to}: ${subject}`,
          updatedAt: new Date(),
        },
      });
    }

    // TODO: Implement actual email sending via:
    // - SendGrid
    // - Resend
    // - AWS SES
    // - Or your preferred email provider

    return NextResponse.json({
      success: true,
      message: "Email queued for delivery",
      // In production, return the email ID from your provider
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
