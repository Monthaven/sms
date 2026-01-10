/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logger, generateRequestId } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        User: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10000, // Limit export to 10k rows
    });

    // Convert to CSV
    const headers = ["Date", "User", "Email", "Action", "Entity Type", "Entity ID", "IP Address"];
    const rows = logs.map((log) => {
      const user = log.User;
      return [
        log.createdAt.toISOString(),
        user?.name || "Unknown",
        user?.email || "",
        log.action,
        log.entityType || "",
        log.entityId || "",
        log.ipAddress || "",
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    const requestId = generateRequestId();
    logger.error("Audit export error", { requestId }, error as Error);
    return NextResponse.json({ error: "Failed to export audit logs", requestId }, { status: 500 });
  }
}
