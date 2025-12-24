/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latency?: number;
      error?: string;
    };
    memory: {
      status: "ok" | "warning" | "critical";
      heapUsed: number;
      heapTotal: number;
      percentUsed: number;
    };
  };
}

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    memory: { status: "ok", heapUsed: 0, heapTotal: 0, percentUsed: 0 },
  };

  // Database health check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }

  // Memory check
  const memoryUsage = process.memoryUsage();
  const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(memoryUsage.heapTotal / 1024 / 1024);
  const percentUsed = Math.round((heapUsed / heapTotal) * 100);

  checks.memory = {
    status: percentUsed > 90 ? "critical" : percentUsed > 75 ? "warning" : "ok",
    heapUsed,
    heapTotal,
    percentUsed,
  };

  // Determine overall status
  let overallStatus: HealthStatus["status"] = "healthy";
  if (checks.database.status === "down") {
    overallStatus = "unhealthy";
  } else if (checks.memory.status === "critical") {
    overallStatus = "unhealthy";
  } else if (checks.memory.status === "warning") {
    overallStatus = "degraded";
  }

  const healthResponse: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  };

  const httpStatus = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

  return NextResponse.json(healthResponse, { status: httpStatus });
}
