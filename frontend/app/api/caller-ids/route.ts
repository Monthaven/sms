/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

interface TwilioPhoneNumber {
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  sid: string;
}

interface CallerIdResponse {
  id: string;
  phoneNumber: string;
  friendlyName: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  isDefault: boolean;
  source: "twilio" | "verified" | "custom";
}

/**
 * GET /api/caller-ids
 * Fetch available caller IDs for outbound calls
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerIds: CallerIdResponse[] = [];

    // Get primary number from env
    const primaryNumber = process.env.TWILIO_PHONE_NUMBER;
    if (primaryNumber) {
      callerIds.push({
        id: "primary",
        phoneNumber: primaryNumber,
        friendlyName: "Primary Line",
        capabilities: { voice: true, sms: true, mms: true },
        isDefault: true,
        source: "twilio",
      });
    }

    // If Twilio is configured, fetch all phone numbers from account
    if (accountSid && authToken) {
      try {
        const client = twilio(accountSid, authToken);
        const numbers = await client.incomingPhoneNumbers.list({ limit: 50 });

        for (const num of numbers) {
          // Skip if already added as primary
          if (num.phoneNumber === primaryNumber) continue;

          callerIds.push({
            id: num.sid,
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName || num.phoneNumber,
            capabilities: {
              voice: num.capabilities?.voice ?? false,
              sms: num.capabilities?.sms ?? false,
              mms: num.capabilities?.mms ?? false,
            },
            isDefault: false,
            source: "twilio",
          });
        }

        // Also fetch verified caller IDs (for calling from non-Twilio numbers)
        const verifiedNumbers = await client.outgoingCallerIds.list({ limit: 50 });
        for (const verified of verifiedNumbers) {
          callerIds.push({
            id: verified.sid,
            phoneNumber: verified.phoneNumber,
            friendlyName: verified.friendlyName || verified.phoneNumber,
            capabilities: { voice: true, sms: false, mms: false }, // Verified numbers can only call
            isDefault: false,
            source: "verified",
          });
        }
      } catch (twilioError) {
        logger.warn("Failed to fetch Twilio numbers", { error: twilioError });
        // Continue with just the primary number
      }
    }

    // Get any custom caller IDs stored in database (if we have such a model)
    // This allows admins to configure additional numbers
    try {
      const settings = await prisma.settings.findFirst({
        where: { key: "additional_caller_ids" },
      });

      if (settings?.value) {
        const customIds = JSON.parse(settings.value as string);
        if (Array.isArray(customIds)) {
          for (const custom of customIds) {
            if (custom.phoneNumber) {
              callerIds.push({
                id: `custom-${custom.phoneNumber}`,
                phoneNumber: custom.phoneNumber,
                friendlyName: custom.friendlyName || custom.phoneNumber,
                capabilities: custom.capabilities || { voice: true, sms: true, mms: false },
                isDefault: false,
                source: "custom",
              });
            }
          }
        }
      }
    } catch {
      // Settings might not exist yet
    }

    // Filter by user role - only ADMIN can see all numbers
    let filteredCallerIds = callerIds;

    // Non-admins only see primary/default caller IDs and any shared ones
    if (session.role !== "ADMIN" && session.role !== "MANAGER") {
      filteredCallerIds = callerIds.filter((cid) => cid.isDefault || cid.source === "twilio");
    }

    return NextResponse.json({
      success: true,
      data: filteredCallerIds,
      total: filteredCallerIds.length,
    });
  } catch (error) {
    logger.error("Failed to fetch caller IDs", { error });
    return NextResponse.json(
      { error: "Failed to fetch caller IDs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/caller-ids
 * Add a custom caller ID (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.id || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, friendlyName, capabilities } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "");
    if (!normalizedPhone.startsWith("+")) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (e.g., +15551234567)" },
        { status: 400 }
      );
    }

    // Get existing custom caller IDs
    let existingIds: any[] = [];
    try {
      const settings = await prisma.settings.findFirst({
        where: { key: "additional_caller_ids" },
      });
      if (settings?.value) {
        existingIds = JSON.parse(settings.value as string);
      }
    } catch {
      // Settings might not exist yet
    }

    // Check if already exists
    if (existingIds.some((id: any) => id.phoneNumber === normalizedPhone)) {
      return NextResponse.json(
        { error: "Caller ID already exists" },
        { status: 409 }
      );
    }

    // Add new caller ID
    existingIds.push({
      phoneNumber: normalizedPhone,
      friendlyName: friendlyName || normalizedPhone,
      capabilities: capabilities || { voice: true, sms: true, mms: false },
      addedAt: new Date().toISOString(),
      addedBy: session.id,
    });

    // Save to database using upsert pattern
    const existing = await prisma.settings.findFirst({
      where: { key: "additional_caller_ids" },
    });

    if (existing) {
      await prisma.settings.update({
        where: { key: "additional_caller_ids" },
        data: { value: JSON.stringify(existingIds) },
      });
    } else {
      await prisma.settings.create({
        data: {
          key: "additional_caller_ids",
          value: JSON.stringify(existingIds),
        },
      });
    }

    logger.info("Custom caller ID added", {
      phoneNumber: normalizedPhone,
      addedBy: session.id,
    });

    return NextResponse.json({
      success: true,
      message: "Caller ID added",
    });
  } catch (error) {
    logger.error("Failed to add caller ID", { error });
    return NextResponse.json(
      { error: "Failed to add caller ID" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/caller-ids
 * Remove a custom caller ID (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentUser();
    if (!session?.id || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Get existing custom caller IDs
    let existingIds: any[] = [];
    try {
      const settings = await prisma.settings.findFirst({
        where: { key: "additional_caller_ids" },
      });
      if (settings?.value) {
        existingIds = JSON.parse(settings.value as string);
      }
    } catch {
      return NextResponse.json(
        { error: "No custom caller IDs found" },
        { status: 404 }
      );
    }

    // Remove the caller ID
    const filteredIds = existingIds.filter((id: any) => id.phoneNumber !== phoneNumber);

    if (filteredIds.length === existingIds.length) {
      return NextResponse.json(
        { error: "Caller ID not found" },
        { status: 404 }
      );
    }

    // Save to database
    await prisma.settings.update({
      where: { key: "additional_caller_ids" },
      data: { value: JSON.stringify(filteredIds) },
    });

    logger.info("Custom caller ID removed", {
      phoneNumber,
      removedBy: session.id,
    });

    return NextResponse.json({
      success: true,
      message: "Caller ID removed",
    });
  } catch (error) {
    logger.error("Failed to remove caller ID", { error });
    return NextResponse.json(
      { error: "Failed to remove caller ID" },
      { status: 500 }
    );
  }
}
