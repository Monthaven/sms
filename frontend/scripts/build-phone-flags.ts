/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Build unified phone_flags table.
 * Merges: DNC list, opt-outs (from messages), intent signals.
 * Run: npx ts-node scripts/build-phone-flags.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { normalizePhone } from "../lib/phone-utils";

const prisma = new PrismaClient();

// Intent keywords from message content
const INTENT_KEYWORDS = {
  HOT: ["interested", "sell", "price", "offer", "call me", "contact me", "ready"],
  WARM: ["maybe", "thinking", "tell me more", "information", "how much"],
  NEGATIVE: ["stop", "remove", "unsubscribe", "not interested", "no", "quit", "spam", "harassing", "do not contact", "don't contact", "block", "hate", "annoying", "unwanted", "cease", "decline", "refuse", "discontinue", "opt out", "opt-out", "optout", "cancel", 
    "end", "terminate", "reject", "deny", "dismiss", "avoid", "shut down", "shut off", "leave me alone", "get lost", "go away", "stop messaging", "stop texts", "stop text messages", "stop sms", "no more messages", "no more texts", "no more text messages", "no more sms",
    "please stop", "please no", "please do not", "never contact", "never contact me", "do not text", "do not text me", "Report", "report spam"
  ],
};

type Intent = "HOT" | "WARM" | "NEUTRAL" | "NEGATIVE";

function classifyIntent(messageText: string): Intent {
  const text = (messageText || "").toLowerCase();
  if (INTENT_KEYWORDS.NEGATIVE.some((k) => text.includes(k))) return "NEGATIVE";
  if (INTENT_KEYWORDS.HOT.some((k) => text.includes(k))) return "HOT";
  if (INTENT_KEYWORDS.WARM.some((k) => text.includes(k))) return "WARM";
  return "NEUTRAL";
}

async function buildPhoneFlags() {
  console.log("Building phone flags...");

  // Get all unique phones from contacts
  const contacts = await prisma.contact.findMany({
    select: { id: true, phoneE164: true, doNotContact: true },
  });

  const allPhones = new Map<string, { contactId?: string; doNotContact?: boolean }>();

  for (const c of contacts) {
    if (c.phoneE164) {
      allPhones.set(c.phoneE164, { contactId: c.id, doNotContact: c.doNotContact ?? false });
    }
  }

  console.log(`Found ${allPhones.size} unique phone numbers from contacts`);

  // DNC list phones
  const dncRows = await prisma.dncList.findMany({ select: { phoneE164: true } });
  for (const row of dncRows) {
    const phone = normalizePhone(row.phoneE164);
    if (!phone) continue;
    if (!allPhones.has(phone)) allPhones.set(phone, {});
  }
  console.log(`Loaded ${dncRows.length} DNC entries`);

  // Messages for intent and opt-out detection
  const messages = await prisma.message.findMany({
    where: { direction: "inbound" },
    select: { phone: true, body: true, createdAt: true, contactId: true },
  });
  console.log(`Found ${messages.length} inbound messages for intent scoring`);

  // Build phone -> flags mapping
  const phoneFlags = new Map<
    string,
    {
      dnc: boolean;
      opt_out: boolean;
      bounced: boolean;
      carrier_blocked: boolean;
      intent: Intent;
      intent_updated: Date | null;
      source: string | null;
      contactId?: string;
    }
  >();

  // Initialize from contacts/DNC
  for (const [phone, meta] of allPhones.entries()) {
    phoneFlags.set(phone, {
      dnc: Boolean(meta.doNotContact) || dncRows.some((row) => normalizePhone(row.phoneE164) === phone),
      opt_out: false,
      bounced: false,
      carrier_blocked: false,
      intent: "NEUTRAL",
      intent_updated: null,
      source: null,
      contactId: meta.contactId,
    });
  }

  // Process messages for intent and opt-out detection
  for (const msg of messages) {
    const phone = normalizePhone(msg.phone);
    if (!phone) continue;
    if (!phoneFlags.has(phone)) {
      phoneFlags.set(phone, {
        dnc: false,
        opt_out: false,
        bounced: false,
        carrier_blocked: false,
        intent: "NEUTRAL",
        intent_updated: null,
        source: null,
        contactId: msg.contactId || undefined,
      });
    }
    const flags = phoneFlags.get(phone)!;
    const intent = classifyIntent(msg.body || "");
    const isOptOutKeyword = intent === "NEGATIVE" && ["stop", "unsubscribe", "remove"].some((k) => (msg.body || "").toLowerCase().includes(k));

    if (isOptOutKeyword) flags.opt_out = true;
    if (flags.intent !== "NEGATIVE") {
      flags.intent = intent;
    }
    if (!flags.intent_updated || (msg.createdAt && msg.createdAt > flags.intent_updated)) {
      flags.intent_updated = msg.createdAt || flags.intent_updated;
    }
    flags.source = flags.source || "messages";
    if (!flags.contactId && msg.contactId) {
      flags.contactId = msg.contactId;
    }
  }

  // Upsert phone flags
  console.log("Upserting phone flags...");
  let upserted = 0;
  for (const [phone, flags] of phoneFlags.entries()) {
    await prisma.phoneFlag.upsert({
      where: { phone },
      create: {
        phone,
        dnc: flags.dnc,
        opt_out: flags.opt_out,
        bounced: flags.bounced,
        carrier_blocked: flags.carrier_blocked,
        phone_type: "unknown",
        carrier: null,
        intent: flags.intent,
        intent_updated: flags.intent_updated,
        source: flags.source,
        ...(flags.contactId ? { contact: { connect: { id: flags.contactId } } } : {}),
      } as Prisma.PhoneFlagUncheckedCreateInput,
      update: {
        dnc: flags.dnc,
        opt_out: flags.opt_out,
        bounced: flags.bounced,
        carrier_blocked: flags.carrier_blocked,
        intent: flags.intent,
        intent_updated: flags.intent_updated,
        source: flags.source,
        ...(flags.contactId ? { contact: { connect: { id: flags.contactId } } } : {}),
      },
    });
    upserted++;
  }

  // Stats
  const stats = await prisma.phoneFlag.groupBy({
    by: ["intent"],
    _count: true,
  });
  const optedOut = await prisma.phoneFlag.count({ where: { opt_out: true } });
  const dncCount = await prisma.phoneFlag.count({ where: { dnc: true } });

  console.log(`\n=== Phone Flag Stats ===`);
  console.log(`Total upserted: ${upserted}`);
  for (const s of stats) {
    console.log(`${s.intent}: ${s._count}`);
  }
  console.log(`Opted out: ${optedOut}`);
  console.log(`DNC: ${dncCount}`);
}

buildPhoneFlags()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
