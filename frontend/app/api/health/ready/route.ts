/**
 * PROPRIETARY — Always Improving LLC
 * Readiness Check - Verifies all dependencies are ready
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health/ready - Kubernetes-style readiness probe
 */
export async function GET(req: NextRequest) {
  const checks: Record<string, { ready: boolean; error?: string }> = {};

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ready: true };
  } catch (error: any) {
    checks.database = { ready: false, error: error.message };
  }

  // Check required environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "NEXTAUTH_SECRET",
  ];

  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingEnvVars.length > 0) {
    checks.environment = { 
      ready: false, 
      error: `Missing: ${missingEnvVars.join(", ")}` 
    };
  } else {
    checks.environment = { ready: true };
  }

  // Check Twilio connectivity (light check)
  if (process.env.TWILIO_ACCOUNT_SID) {
    checks.twilio = { ready: true };
  } else {
    checks.twilio = { ready: false, error: "Not configured" };
  }

  const allReady = Object.values(checks).every(c => c.ready);

  return NextResponse.json(
    {
      ready: allReady,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allReady ? 200 : 503 }
  );
}
