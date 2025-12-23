/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface UserSettings {
  id: string;
  name: string | null;
  email: string;
  twilioNumber: string | null;
  settings: string | null;
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
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
}

export async function PUT(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, notifications, quietHours, preferences } = body;

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

  return NextResponse.json({ success: true });
}
