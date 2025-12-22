/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const settings = await prisma.settings.findMany();
  const obj: Record<string, string> = {};
  settings.forEach((s) => {
    obj[s.key] = s.value;
  });
  return NextResponse.json(obj);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { key, value } = body || {};
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }
  const updated = await prisma.settings.upsert({
    where: { key },
    update: { value: String(value ?? "") },
    create: { key, value: String(value ?? "") },
  });
  return NextResponse.json(updated);
}
