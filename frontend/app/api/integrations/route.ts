import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { evaluateTwilioStatus } from "@/lib/integrations";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
const db = prisma as any;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IntegrationStatus = {
  id: string;
  name: string;
  status: "connected" | "pending" | "disconnected";
  lastEvent: string;
  meta?: Record<string, unknown>;
};

export async function GET() {
  const delegate = db?.webhookLog;
  let logs: any[] = [];
  let twilioStatus: any = { status: "connected" };

  try {
    const results = await Promise.all([
      delegate
        ? delegate.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
      Promise.resolve(evaluateTwilioStatus()),
    ]);
    logs = results[0] || [];
    twilioStatus = results[1] || twilioStatus;
  } catch (err: any) {
    console.debug && console.debug("Integrations route: prisma query failed, returning defaults.", err?.code || err?.message || err);
    logs = [];
    twilioStatus = { status: "missing" };
  }

  const latestByProvider = new Map<string, Date>();
  for (const log of logs) {
    if (!latestByProvider.has(log.provider)) {
      latestByProvider.set(log.provider, log.createdAt);
    }
  }

  const integrations: IntegrationStatus[] = [
    buildEzTexting(latestByProvider),
    buildWebhook(latestByProvider),
    buildTwilio(twilioStatus, latestByProvider.get("TWILIO")),
  ];

  return NextResponse.json(integrations);
}

function buildEzTexting(map: Map<string, Date>): IntegrationStatus {
  const hasCreds =
    Boolean(process.env.EZTEXTING_API_KEY && process.env.EZTEXTING_API_KEY.length > 0) ||
    (Boolean(process.env.EZTEXTING_USER) && Boolean(process.env.EZTEXTING_PASS));
  const status: IntegrationStatus["status"] = hasCreds ? "connected" : "pending";
  const lastEvent = map.get("EZTEXTING");

  return {
    id: "eztexting",
    name: "EzTexting",
    status,
    lastEvent: lastEvent
      ? `Webhook ${lastEvent.toISOString()}`
      : hasCreds
      ? "Awaiting traffic"
      : "Credentials needed",
    meta: { lastWebhookAt: lastEvent?.toISOString() },
  };
}

function buildWebhook(map: Map<string, Date>): IntegrationStatus {
  const last = map.get("WEBHOOK") ?? map.get("EZTEXTING") ?? map.get("TWILIO");

  return {
    id: "webhook",
    name: "Webhook Relay",
    status: last ? "connected" : "pending",
    lastEvent: last ? `Last POST ${last.toISOString()}` : "No inbound traffic yet",
    meta: { providersTracked: Array.from(map.keys()) },
  };
}

function buildTwilio(status: ReturnType<typeof evaluateTwilioStatus>, last?: Date): IntegrationStatus {
  let normalized: IntegrationStatus["status"] = "connected";
  if (status.status === "pending") normalized = "pending";
  if (status.status === "missing") normalized = "disconnected";

  return {
    id: "twilio",
    name: "Twilio",
    status: normalized,
    lastEvent: last ? `Webhook ${last.toISOString()}` : "No webhook calls yet",
    meta: status,
  };
}
