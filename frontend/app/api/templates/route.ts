/**
 * PROPRIETARY — Always Improving LLC
 * SMS Templates CRUD API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(1600),
  category: z.string().optional(),
});

/**
 * GET - List templates
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/templates", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const onlyActive = searchParams.get("onlyActive") !== "false";

  try {
    const whereCondition: any = {
      OR: [
        { createdBy: user.id },
        ...(["ADMIN", "MANAGER"].includes(user.role) ? [{}] : [{ isActive: true }]),
      ],
    };

    if (onlyActive) {
      whereCondition.isActive = true;
    }

    if (category) {
      whereCondition.category = category;
    }

    const templates = await prisma.smsTemplate.findMany({
      where: whereCondition,
      orderBy: [
        { usageCount: "desc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        name: true,
        body: true,
        category: true,
        isActive: true,
        usageCount: true,
        createdBy: true,
        createdAt: true,
        creator: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group by category
    const grouped = templates.reduce((acc, template) => {
      const cat = template.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(template);
      return acc;
    }, {} as Record<string, typeof templates>);

    return NextResponse.json({
      templates,
      grouped,
      total: templates.length,
    });
  } catch (error: any) {
    log.error("Failed to fetch templates", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

/**
 * POST - Create template
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const log = logger.child({ endpoint: "/api/templates", requestId });

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = templateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { name, content, category } = parsed.data;

    const template = await prisma.smsTemplate.create({
      data: {
        name,
        body: content,
        category: category || null,
        createdBy: user.id,
      },
    });

    log.info("Template created", { templateId: template.id, userId: user.id });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    log.error("Failed to create template", { error: error.message });
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
