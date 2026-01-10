/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || !["ADMIN", "MANAGER"].includes(currentUser.role)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      sections: true,
      twilioNumber: true,
      contractSignedAt: true,
      createdAt: true,
      _count: {
        select: { Lead: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const normalized = users.map((user) => ({
    ...user,
    _count: { assignedLeads: user._count?.Lead ?? 0 },
  }));

  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const body = await req.json();
  const { email, name, role, sections } = body;

  if (!email) {
    return NextResponse.json({ error: { message: "Email is required" } }, { status: 400 });
  }

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: { message: "User already exists" } }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      name: name || null,
      role: role || "AGENT",
      sections: sections || ["sms"],
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(user, { status: 201 });
}
