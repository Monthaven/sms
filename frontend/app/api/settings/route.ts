/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { checkRateLimit, getClientIP, RATE_LIMITS, rateLimitHeaders } from "@/lib/rate-limit";
import { z } from "zod";

interface UserSettings {
  id: string;
  name: string | null;
  email: string;
  twilioNumber: string | null;
  settings: string | null;
}

// Validation schemas
const notificationsSchema = z.object({
  newLeads: z.boolean().optional(),
  callbacks: z.boolean().optional(),
  hotLeads: z.boolean().optional(),
  sound: z.boolean().optional(),
}).optional();

const quietHoursSchema = z.object({
  enabled: z.boolean().optional(),
  start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).optional();

const preferencesSchema = z.object({
  darkMode: z.boolean().optional(),
  autoDialNext: z.boolean().optional(),
  maskPhoneNumbers: z.boolean().optional(),
}).optional();

const settingsUpdateSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional().nullable(),
  notifications: notificationsSchema,
  quietHours: quietHoursSchema,
  preferences: preferencesSchema,
});

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/settings", requestId });

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit(clientIP, RATE_LIMITS.API_GENERAL);
  
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientIP });
    return NextResponse.json(
      { error: { message: "Rate limit exceeded" } },
      { status: 429 }
    );
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      log.warn("Unauthorized settings access attempt");
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    // Use raw query to get settings field since Prisma client may not be regenerated
    const users = await prisma.$queryRaw<UserSettings[]>`
      SELECT id, name, email, "twilioNumber", settings::text
      FROM "User"
      WHERE id = ${currentUser.id}
      LIMIT 1
    `;

    if (!users.length) {
      log.warn("User not found", { userId: currentUser.id });
      return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
    }

    const user = users[0];

    // Parse settings JSON or use defaults
    let settings: Record<string, unknown> = {};
    try {
      settings = user.settings ? JSON.parse(user.settings) : {};
    } catch {
      settings = {};
    }

    log.debug("Settings retrieved", { userId: currentUser.id });

    return NextResponse.json({
      name: user.name || "",
      email: user.email || "",
      phone: user.twilioNumber || "",
      notifications: {
        newLeads: (settings.notifications as Record<string, boolean>)?.newLeads ?? true,
        callbacks: (settings.notifications as Record<string, boolean>)?.callbacks ?? true,
        hotLeads: (settings.notifications as Record<string, boolean>)?.hotLeads ?? true,
        sound: (settings.notifications as Record<string, boolean>)?.sound ?? true,
      },
      quietHours: {
        enabled: (settings.quietHours as Record<string, unknown>)?.enabled ?? false,
        start: (settings.quietHours as Record<string, string>)?.start ?? "21:00",
        end: (settings.quietHours as Record<string, string>)?.end ?? "08:00",
      },
      preferences: {
        darkMode: (settings.preferences as Record<string, boolean>)?.darkMode ?? true,
        autoDialNext: (settings.preferences as Record<string, boolean>)?.autoDialNext ?? false,
        maskPhoneNumbers: (settings.preferences as Record<string, boolean>)?.maskPhoneNumbers ?? true,
      },
    });
  } catch (error: any) {
    log.error("Failed to fetch settings", {}, error);
    return NextResponse.json(
      { error: { message: "Failed to fetch settings" } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/settings", method: "PUT", requestId });

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateLimit = await checkRateLimit(clientIP, RATE_LIMITS.API_GENERAL);
  
  if (!rateLimit.success) {
    log.warn("Rate limit exceeded", { clientIP });
    return NextResponse.json(
      { error: { message: "Rate limit exceeded" } },
      { status: 429 }
    );
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      log.warn("Unauthorized settings update attempt");
      return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate input
    const validation = settingsUpdateSchema.safeParse(body);
    if (!validation.success) {
      log.warn("Invalid settings input", { errors: validation.error.flatten() });
      return NextResponse.json(
        { error: { message: "Invalid input", details: validation.error.flatten() } },
        { status: 400 }
      );
    }

    const { name, email, phone, notifications, quietHours, preferences } = validation.data;

    // Build settings object to store as JSON
    const settingsJson = JSON.stringify({
      notifications,
      quietHours,
      preferences,
    });

    // Use raw query to update settings
    await prisma.$executeRaw`
      UPDATE "User"
      SET 
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        "twilioNumber" = COALESCE(${phone}, "twilioNumber"),
        settings = ${settingsJson}::jsonb,
        "updatedAt" = NOW()
      WHERE id = ${currentUser.id}
    `;

    log.info("Settings updated", { userId: currentUser.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    log.error("Failed to update settings", {}, error);
    return NextResponse.json(
      { error: { message: "Failed to update settings" } },
      { status: 500 }
    );
  }
}
