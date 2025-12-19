import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendSMS, fillTemplate } from "@/lib/twilio";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getSettings() {
  const rows = await prisma.settings.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    maxPerRun: Number(map.get("MAX_MESSAGES_PER_RUN") || process.env.MAX_MESSAGES_PER_RUN || 100),
    delayMs: Number(map.get("DELAY_BETWEEN_SENDS_MS") || process.env.DELAY_BETWEEN_SENDS_MS || 2000),
    agentName: map.get("AGENT_NAME") || process.env.AGENT_NAME || "Monthaven",
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if ((process.env.TWILIO_ENABLED || "false").toLowerCase() !== "true") {
    return NextResponse.json({ error: "TWILIO_DISABLED" }, { status: 400 });
  }

  const settings = await getSettings();
  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: 0 };

  try {
    const queue = await prisma.sequenceContact.findMany({
      where: { status: "active", next_send_at: { lte: now } },
      orderBy: { next_send_at: "asc" },
      take: settings.maxPerRun,
    });

    for (const sc of queue) {
      if (results.sent >= settings.maxPerRun) break;

      // Load contact and sequence/steps
      const [contact, steps] = await Promise.all([
        prisma.contact.findUnique({
          where: { id: sc.contact_id },
          include: { Lead: { include: { property: true }, take: 1 } },
        }),
        prisma.sequenceStep.findMany({
          where: { sequenceId: sc.sequence_id },
          orderBy: { stepNumber: "asc" },
        }),
      ]);

      if (!contact) {
        results.skipped++;
        continue;
      }

      const step = steps[sc.current_step ?? 0];
      if (!step) {
        await prisma.sequenceContact.update({
          where: { id: sc.id },
          data: { status: "completed", completedAt: new Date() },
        });
        results.skipped++;
        continue;
      }

      const phone = contact.phoneE164 || contact.phone_1;
      if (!phone) {
        results.skipped++;
        continue;
      }

      const phoneFlag = await prisma.phoneFlag.findUnique({ where: { phone } });
      if (phoneFlag?.opt_out) {
        await prisma.sequenceContact.update({
          where: { id: sc.id },
          data: { status: "opted_out" },
        });
        results.skipped++;
        continue;
      }

      const property = contact.Lead?.[0]?.property;
      const messageBody = fillTemplate(step.template, {
        firstName: contact.firstName || contact.first_name || "",
        lastName: contact.lastName || contact.last_name || "",
        propertyAddress: property?.addressLine1 || property?.address || "",
        propertyName: property?.addressLine1 || property?.address || "",
        agentName: settings.agentName,
      });

      try {
        const res = await sendSMS(phone, messageBody, {});

        await prisma.message.create({
          data: {
            phone,
            direction: "OUTBOUND",
            body: res.body,
            status: "SENT",
            provider: "TWILIO",
            campaign_id: sc.sequence_id,
            contactId: contact.id,
            intent: null,
          },
        });

        const nextIndex = (sc.current_step ?? 0) + 1;
        const nextStep = steps[nextIndex];
        const nextSend =
          nextStep && typeof nextStep.delayDays === "number"
            ? new Date(Date.now() + (nextStep.delayDays || 0) * 24 * 60 * 60 * 1000)
            : null;

        await prisma.sequenceContact.update({
          where: { id: sc.id },
          data: {
            current_step: nextIndex,
            last_sent_at: new Date(),
            next_send_at: nextSend,
            status: nextStep ? "active" : "completed",
          },
        });

        await prisma.sequence.update({
          where: { id: sc.sequence_id },
          data: { messagesSent: { increment: 1 } },
        });

        results.sent++;
        if (results.sent < settings.maxPerRun) {
          await sleep(settings.delayMs);
        }
      } catch (err) {
        console.error("Send error", err);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
