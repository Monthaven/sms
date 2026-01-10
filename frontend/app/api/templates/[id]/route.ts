/**
 * PROPRIETARY — Always Improving LLC
 * SMS Template by ID - GET, PUT, DELETE
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(1600).optional(),
  category: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

/**
 * GET - Single template
 */
export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.smsTemplate.findUnique({
    where: { id },
    include: {
      User: { select: { name: true } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Check access - only admin or template creator
  if (template.createdBy !== user.id && !["ADMIN", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { User: Creator, ...rest } = template;

  return NextResponse.json({ 
    template: {
      ...rest,
      creator: Creator,
    },
  });
}

/**
 * PUT - Update template
 */
export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: `/api/templates/${id}`, requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.smsTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Only owner or admin can update
  if (template.createdBy !== user.id && !["ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Cannot edit this template" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { name, content, category, isActive } = parsed.data;

    const updated = await prisma.smsTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(content && { body: content }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    log.info("Template updated", { templateId: id, userId: user.id });

    return NextResponse.json({ template: updated });
  } catch (error: any) {
    log.error("Failed to update template", { error: error.message });
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

/**
 * DELETE - Remove template
 */
export async function DELETE(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: `/api/templates/${id}`, requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.smsTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Only owner or admin can delete
  if (template.createdBy !== user.id && !["ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "Cannot delete this template" }, { status: 403 });
  }

  await prisma.smsTemplate.delete({
    where: { id },
  });

  log.info("Template deleted", { templateId: id, userId: user.id });

  return NextResponse.json({ success: true });
}

/**
 * PATCH - Increment usage count (when template is used)
 */
export async function PATCH(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.smsTemplate.update({
    where: { id },    data: {
      usageCount: { increment: 1 },
    },
    select: { id: true, usageCount: true },
  });

  return NextResponse.json({ template });
}
