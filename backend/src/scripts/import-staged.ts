import fs from "fs";
import path from "path";
import csv from "csv-parser";
import minimist from "minimist";
import { prisma } from "../db";
import { normalizePhone } from "../utils/phone";
import { Campaign, Channel, Direction, LeadStatus } from "@prisma/client";

type StagedContact = {
  phone?: string;
  owner_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
  units?: number | string;
  confidence_seed?: number;
  commercial_score?: number;
  status?: string;
  context_tags?: string[];
  context_bucket?: string;
  dnc?: boolean;
  last_outbound_at?: string | null;
  last_outbound_message?: string | null;
  last_inbound_at?: string | null;
  last_inbound_message?: string | null;
  last_inbound_sentiment?: string | null;
  last_inbound_heat?: string | null;
  outbound_source?: string | null;
  inbound_source?: string | null;
  needs_follow_up?: boolean;
  [key: string]: any;
};

type StagedInteraction = {
  phone?: string;
  direction?: string;
  timestamp?: string | null;
  body?: string | null;
  source?: string | null;
};

type CliArgs = {
  contacts?: string;
  interactions?: string;
  dnc?: string;
  campaign?: string;
  campaignId?: string;
};

const DEFAULT_SOURCE = "LEGACY_IMPORT";

async function main() {
  const argv = minimist(process.argv.slice(2)) as CliArgs;
  const contactsPath = argv.contacts;
  if (!contactsPath) {
    throw new Error("Please provide --contacts=<path to commercial_contacts.json>");
  }

  if (!argv.campaign && !argv.campaignId) {
    throw new Error("Provide --campaign=<name> or --campaignId=<id> so leads can be associated.");
  }

  const contactsFullPath = path.resolve(process.cwd(), contactsPath);
  const contactsRaw = JSON.parse(fs.readFileSync(contactsFullPath, "utf-8")) as StagedContact[];

  const campaignId = await resolveCampaignId(argv.campaignId, argv.campaign);

  const contactCache = new Map<string, string>();
  const stats = {
    contactsProcessed: 0,
    contactsSkipped: 0,
    leadsLinked: 0,
    dncTagged: 0,
    propertiesLinked: 0,
  };

  for (const entry of contactsRaw) {
    const phone = normalizePhone(entry.phone);
    if (!phone) {
      stats.contactsSkipped++;
      continue;
    }

    const { firstName, lastName } = splitName(entry.owner_name ?? "");
    const contact = await prisma.contact.upsert({
      where: { phoneE164: phone },
      update: {
        firstName,
        lastName,
        phoneType: entry.property_type || undefined,
        source: DEFAULT_SOURCE,
      },
      create: {
        phoneE164: phone,
        firstName,
        lastName,
        phoneType: entry.property_type || undefined,
        source: DEFAULT_SOURCE,
      },
    });

    contactCache.set(phone, contact.id);
    stats.contactsProcessed++;

    const property = await upsertProperty(entry);
    if (!property) {
      stats.contactsSkipped++;
      continue;
    }
    stats.propertiesLinked++;

    const leadStatus = deriveLeadStatus(entry);
    const sentimentScore = deriveSentimentScore(entry, leadStatus);
    const notes = buildNotes(entry);

    await prisma.lead.upsert({
      where: {
        campaignId_contactId_propertyId: {
          campaignId,
          contactId: contact.id,
          propertyId: property.id,
        },
      },
      update: {
        status: leadStatus,
        sentimentScore,
        notes,
        propertyId: property.id,
      },
      create: {
        campaignId,
        contactId: contact.id,
        propertyId: property.id,
        status: leadStatus,
        sentimentScore,
        notes,
      },
    });

    stats.leadsLinked++;

    if (entry.dnc) {
      await prisma.dncList.upsert({
        where: { phoneE164: phone },
        update: { reason: "Legacy file flag" },
        create: { phoneE164: phone, reason: "Legacy file flag" },
      });
      stats.dncTagged++;
    }
  }

  if (argv.interactions) {
    await importInteractions(argv.interactions, contactCache);
  }

  if (argv.dnc) {
    await importDncCsv(argv.dnc);
  }

  console.table(stats);
  await prisma.$disconnect();
}

async function resolveCampaignId(explicitId?: string, campaignName?: string): Promise<string> {
  if (explicitId) return explicitId;
  if (!campaignName) throw new Error("Campaign name required when campaignId absent.");

  const existing = await prisma.campaign.findFirst({ where: { name: campaignName } });
  if (existing) return existing.id;

  const created = await prisma.campaign.create({
    data: {
      name: campaignName,
      status: "IMPORTED",
    },
  });
  return created.id;
}

function splitName(raw: string) {
  if (!raw) return { firstName: undefined, lastName: undefined };
  const parts = raw.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined };
  return { firstName: parts.shift(), lastName: parts.join(" ") };
}

async function upsertProperty(entry: StagedContact) {
  const addressLine1 = (entry.address || "").split(",")[0].trim();
  const city = entry.city || extractCity(entry.address);
  const state = entry.state || extractState(entry.address);

  if (!addressLine1) return null;

  return prisma.property.upsert({
    where: {
      addressLine1_city_state: {
        addressLine1,
        city: city || "",
        state: state || "",
      },
    },
    update: {
      postalCode: entry.zip || undefined,
      rawDetails: entry as any,
    },
    create: {
      addressLine1,
      city: city || "",
      state: state || "",
      postalCode: entry.zip || "",
      rawDetails: entry as any,
    },
  });
}

function extractCity(address?: string) {
  if (!address) return undefined;
  const parts = address.split(",");
  return parts.length > 1 ? parts[1].trim() : undefined;
}

function extractState(address?: string) {
  if (!address) return undefined;
  const parts = address.split(",");
  if (parts.length < 3) return undefined;
  const stateZip = parts[2].trim().split(" ");
  return stateZip[0];
}

function deriveLeadStatus(entry: StagedContact): LeadStatus {
  if (entry.dnc) return LeadStatus.RESP_STOP;
  const bucket = (entry.context_bucket || "").toUpperCase();
  switch (bucket) {
    case "ENGAGED_POSITIVE":
      return LeadStatus.RESP_HOT;
    case "ENGAGED_OTHER":
      return LeadStatus.RESP_WARM;
    case "DECLINED":
      return LeadStatus.RESP_COLD;
    case "NEW_TO_TEXT":
      return LeadStatus.NEW;
    case "NEEDS_FOLLOW_UP":
      return LeadStatus.SENT;
    default:
      return entry.status === "TEXTED_NO_REPLY" ? LeadStatus.SENT : LeadStatus.NEW;
  }
}

function deriveSentimentScore(entry: StagedContact, status: LeadStatus) {
  if (status === LeadStatus.RESP_STOP) return -3;
  if (status === LeadStatus.RESP_COLD) return -1;
  if (entry.last_inbound_heat === "HOT") return 3;
  if (entry.last_inbound_heat === "WARM") return 1;
  if (status === LeadStatus.RESP_HOT) return 3;
  if (status === LeadStatus.RESP_WARM) return 1;
  if (entry.needs_follow_up) return 1;
  return 0;
}

function buildNotes(entry: StagedContact) {
  const parts: string[] = [];
  if (entry.context_tags?.length) parts.push(`Tags: ${entry.context_tags.join(", ")}`);
  if (entry.last_inbound_message) parts.push(`Inbound: ${entry.last_inbound_message}`);
  if (entry.last_outbound_message) parts.push(`Outbound: ${entry.last_outbound_message}`);
  if (entry.last_inbound_sentiment && entry.last_inbound_sentiment !== "UNKNOWN") {
    parts.push(`Sentiment: ${entry.last_inbound_sentiment}`);
  }
  return parts.length ? parts.join("\n") : undefined;
}

async function importInteractions(interactionsPath: string, contactCache: Map<string, string>) {
  const fullPath = path.resolve(process.cwd(), interactionsPath);
  const interactionsRaw = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as StagedInteraction[];
  for (const row of interactionsRaw) {
    const phone = normalizePhone(row.phone);
    if (!phone) continue;
    const body = (row.body || "").trim();
    if (!body) continue;
    let contactId = contactCache.get(phone);
    if (!contactId) {
      const contact = await prisma.contact.upsert({
        where: { phoneE164: phone },
        update: {},
        create: { phoneE164: phone, source: DEFAULT_SOURCE },
      });
      contactId = contact.id;
      contactCache.set(phone, contactId);
    }
    const createdAt = row.timestamp ? new Date(row.timestamp) : new Date();
    const direction = row.direction === "OUTBOUND" ? Direction.OUTBOUND : Direction.INBOUND;

    const existing = await prisma.interaction.findFirst({
      where: { contactId, body, direction, createdAt },
    });
    if (existing) continue;

    await prisma.interaction.create({
      data: {
        contactId,
        channel: Channel.EZTEXTING,
        direction,
        body,
        createdAt,
      },
    });
  }
}

async function importDncCsv(dncPath: string) {
  const fullPath = path.resolve(process.cwd(), dncPath);
  const rows: { phone?: string; reason?: string; message?: string }[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(fullPath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve())
      .on("error", reject);
  });

  for (const row of rows) {
    const phone = normalizePhone(row.phone);
    if (!phone) continue;
    await prisma.dncList.upsert({
      where: { phoneE164: phone },
      update: { reason: row.reason || row.message?.slice(0, 250) },
      create: { phoneE164: phone, reason: row.reason || row.message?.slice(0, 250) },
    });
  }
}

main().catch(async (err) => {
  console.error("Import failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
