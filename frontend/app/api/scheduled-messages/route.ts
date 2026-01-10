/**
 * PROPRIETARY — Always Improving LLC
 * Scheduled Messages API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOptimalSendTime } from "@/lib/quiet-hours";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scheduleSchema = z.object({
  contactId: z.string(),
  leadId: z.string().optional(),
  content: z.string().min(1).max(1600),
  scheduledFor: z.string().datetime(),
  mediaUrls: z.array(z.string().url()).optional(),
  respectQuietHours: z.boolean().optional().default(true),
});

/**
 * GET - List scheduled messages
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const contactId = searchParams.get("contactId");

  const whereCondition: any = {};

  // Filter by user unless admin/manager
  if (!["ADMIN", "MANAGER"].includes(user.role)) {
    whereCondition.userId = user.id;
  }

  if (status) {
    whereCondition.status = status.toUpperCase();
  }

  if (contactId) {
    whereCondition.contactId = contactId;
  }

  const scheduled = await prisma.scheduledMessage.findMany({
    where: whereCondition,
    include: {
      Contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneE164: true,
        },
      },
      User: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  const mapped = scheduled.map(({ Contact, User, ...rest }) => ({
    ...rest,
    contact: Contact,
    user: User,
  }));

  return NextResponse.json({ scheduled: mapped });
}

/**
 * POST - Schedule a message
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/scheduled-messages", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { contactId, leadId, content, scheduledFor, mediaUrls, respectQuietHours } = parsed.data;

    // Verify contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { 
        id: true, 
        phoneE164: true, 
        timezone: true,
        doNotContact: true,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    if (contact.doNotContact) {
      return NextResponse.json({ error: "Contact has opted out of SMS" }, { status: 400 });
    }

    // Check DNC
    const isDnc = await prisma.dncEntry.findFirst({
      where: { phone: contact.phoneE164 },
    });

    if (isDnc) {
      return NextResponse.json({ error: "Number is on DNC list" }, { status: 400 });
    }

    // Adjust time for quiet hours if requested
    let finalScheduledTime = new Date(scheduledFor);
    if (respectQuietHours) {
      finalScheduledTime = getOptimalSendTime(
        finalScheduledTime,
        undefined,
        contact.timezone || undefined
      );
    }

    const scheduled = await prisma.scheduledMessage.create({
      data: {
        id: randomUUID(),
        contactId,
        leadId: leadId || null,
        userId: user.id,
        body: content,
        mediaUrls: mediaUrls || [],
        scheduledAt: finalScheduledTime,
        status: "PENDING",
      },
      include: {
        Contact: {
          select: {
            firstName: true,
            lastName: true,
            phoneE164: true,
          },
        },
      },
    });

    log.info("Message scheduled", { 
      scheduledId: scheduled.id, 
      contactId,
      scheduledFor: finalScheduledTime,
      adjustedForQuietHours: finalScheduledTime.getTime() !== new Date(scheduledFor).getTime(),
    });

    const { Contact, ...rest } = scheduled;

    return NextResponse.json({ 
      scheduled: {
        ...rest,
        contact: Contact,
      },
      adjustedTime: finalScheduledTime.toISOString() !== scheduledFor,
      originalTime: scheduledFor,
      finalTime: finalScheduledTime.toISOString(),
    }, { status: 201 });

  } catch (error: any) {
    log.error("Failed to schedule message", { error: error.message });
    return NextResponse.json({ error: "Failed to schedule message" }, { status: 500 });
  }
}
