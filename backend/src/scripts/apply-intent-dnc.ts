import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { prisma } from "../db";
import { calculateScore, getPriority } from './score-contacts';
import { normalizePhone } from "../utils/phone";

type IntentType = "POSITIVE" | "WARM" | "NEUTRAL" | "NEGATIVE" | "STOP" | "BOUNCE";

type IntentInfo = {
  intent: IntentType;
  reason?: string;
  source: string;
  timestamp?: number;
};

type Stats = {
  intentsCollected: number;
  phonesWithIntent: number;
  contactsUpdated: number;
  contactsNotFound: number;
  dncApplied: number;
  priorityRaised: number;
  smsAllowedSet: number;
  callOnlySet: number;
};

const ROOT_DIR = path.resolve(process.cwd(), "../..");
const BOUNCE_FILE = path.join(ROOT_DIR, "bounce", "contacts_cleaned_with_intent.csv");

console.log("DEBUG ROOT_DIR:", ROOT_DIR);
console.log("DEBUG BOUNCE_FILE exists:", fs.existsSync(BOUNCE_FILE));

async function collectIntentMap(): Promise<Map<string, IntentInfo>> {
  const intentMap = new Map<string, IntentInfo>();

  const upsertIntent = (phone: string, incoming: IntentInfo) => {
    const current = intentMap.get(phone);
    if (!current) {
      intentMap.set(phone, incoming);
      return;
    }
    // Prefer STOP/BOUNCE over other intents; otherwise keep latest timestamp.
    const severity = (i: IntentType) => (i === "STOP" || i === "BOUNCE" ? 2 : i === "NEGATIVE" ? 1 : 0);
    if (severity(incoming.intent) > severity(current.intent)) {
      intentMap.set(phone, incoming);
      return;
    }
    const currTs = current.timestamp ?? 0;
    const nextTs = incoming.timestamp ?? 0;
    if (nextTs > currTs) intentMap.set(phone, incoming);
  };

  const loadCsv = async (filePath: string, onRow: (row: any) => void) => {
    return new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => onRow(row))
        .on("end", () => resolve())
        .on("error", reject);
    });
  };

  // 1) Bounce / intent file
  if (fs.existsSync(BOUNCE_FILE)) {
    let rowCount = 0;
    await loadCsv(BOUNCE_FILE, (row) => {
      rowCount++;
      const phone = normalizePhone(
        row.Phone || row.phone || row.phone_number || row.phoneE164 || row['Phone Number'] || row['Mobile Phone']
      );
      if (!phone) return;
      const intentRaw = (row['INTENT TYPE'] || row.intent || row.last_intent || row.classification || "").toString().toUpperCase();
      console.log("DEBUG bounce row:", phone, intentRaw);
      const intent: IntentType =
        intentRaw.includes("STOP") || intentRaw.includes("DNC") || intentRaw.includes("OPT OUT")
          ? "STOP"
          : intentRaw.includes("BOUNCE") || intentRaw.includes("LANDLINE")
          ? "BOUNCE"
          : intentRaw.includes("NEG")
          ? "NEGATIVE"
          : intentRaw.includes("WARM")
          ? "WARM"
          : intentRaw.includes("POS")
          ? "POSITIVE"
          : "NEUTRAL";
      upsertIntent(phone, { intent, reason: row.reason || row.MESSAGE || row.message, source: "bounce_intent" });
    });
    console.log(`[apply-intent-dnc] Processed bounce file: ${path.basename(BOUNCE_FILE)} - ${rowCount} rows`);
  }

  const collectFromMessages = async (prefix: string, direction: "INBOUND" | "OUTBOUND") => {
    const files = fs
      .readdirSync(ROOT_DIR)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".csv"))
      .map((f) => path.join(ROOT_DIR, f));

    console.log(`DEBUG ${prefix}: found ${files.length} files`, files);

    for (const file of files) {
      let rowCount = 0;
      await loadCsv(file, (row) => {
        rowCount++;
        const phone = normalizePhone(
          row.Phone || row.phone || row['Phone Number'] || row['Mobile Phone'] || row.contact_phone || row.to || row.from
        );
        if (!phone) return;
        const body =
          (row.body ||
            row.Body ||
            row.MESSAGE ||
            row.message ||
            row.Message ||
            row["Message Body"] ||
            row["Message"] ||
            "") as string;
        const tsRaw = (row.timestamp || row.date || row.Date || row.Time || row["Message Time"]) as string | undefined;
        const timestamp = tsRaw ? Date.parse(tsRaw) : undefined;
        const bodyUpper = (body || "").toUpperCase();

        let intent: IntentType | null = null;
        if (/\bSTOP\b/.test(bodyUpper) || bodyUpper.includes("UNSUBSCRIBE")) intent = "STOP";
        else if (bodyUpper.includes("BOUNCE") || bodyUpper.includes("LANDLINE")) intent = "BOUNCE";
        else if (bodyUpper.includes("NOT INTERESTED") || bodyUpper.includes("REMOVE")) intent = "NEGATIVE";
        else if (bodyUpper.includes("YES") || bodyUpper.includes("YEP")) intent = "WARM";

        if (!intent) return;
        upsertIntent(phone, { intent, reason: `msg:${direction}`, source: prefix, timestamp });
      });
      console.log(`[apply-intent-dnc] Processed ${direction} file: ${path.basename(file)} - ${rowCount} rows`);
    }
  };

  await collectFromMessages("Incoming Messages Report-", "INBOUND");
  await collectFromMessages("sent_messages_detailed_", "OUTBOUND");
  await collectFromMessages("sent_messages_", "OUTBOUND");

  return intentMap;
}

function phoneTypeFlags(phoneType?: string, row?: any) {
  // Try multiple column variations if phoneType not provided
  const type = phoneType || (row ? (row['PHONE TYPE'] || row.phoneType || row['Phone Type']) : undefined);
  if (!type) return { smsAllowed: false, callOnly: false };
  const lowered = type.toLowerCase();
  const isWireless = lowered.includes("wireless") || lowered.includes("mobile") || lowered.includes("cell");
  const isLandline = lowered.includes("landline");
  if (isWireless) return { smsAllowed: true, callOnly: false };
  if (isLandline) return { smsAllowed: false, callOnly: true };
  return { smsAllowed: false, callOnly: false };
}

async function applyIntents(intentMap: Map<string, IntentInfo>) {
  const stats: Stats = {
    intentsCollected: intentMap.size,
    phonesWithIntent: 0,
    contactsUpdated: 0,
    contactsNotFound: 0,
    dncApplied: 0,
    priorityRaised: 0,
    smsAllowedSet: 0,
    callOnlySet: 0,
  };

  for (const [phone, info] of intentMap.entries()) {
    stats.phonesWithIntent++;
    const contact = await prisma.contact.findUnique({ where: { phoneE164: phone } });
    if (!contact) {
      stats.contactsNotFound++;
      continue;
    }

    const flags = phoneTypeFlags(contact.phoneType || undefined);
    const data: any = {};

    if (info.intent === "STOP" || info.intent === "BOUNCE" || info.intent === "NEGATIVE") {
      data.doNotContact = true;
      data.blockReason = info.reason || info.intent;
      stats.dncApplied++;
    }

    if (info.intent === "POSITIVE" || info.intent === "WARM") {
      data.priority = "HIGH";
      stats.priorityRaised++;
    }

    if (flags.smsAllowed) {
      data.smsAllowed = true;
      stats.smsAllowedSet++;
    }
    if (flags.callOnly) {
      data.callOnly = true;
      stats.callOnlySet++;
    }

    // Calculate updated score and ownerMatch and include in same update
    try {
      const now = new Date();
      const contactWithIntent = { ...contact, intent: info.intent, lastReceivedAt: now } as any;
      const { score, ownerMatch } = calculateScore(contactWithIntent);
      data.score = score;
      data.priority = getPriority(score);
      data.ownerMatch = ownerMatch;
      data.intent = info.intent;
      data.lastReceivedAt = now;
    } catch (err) {
      console.warn('[apply-intent-dnc] calculateScore failed, skipping score update', err);
    }

    await prisma.contact.update({
      where: { phoneE164: phone },
      data,
    });
    stats.contactsUpdated++;
  }

  return stats;
}

async function main() {
  console.log("[apply-intent-dnc] Building phone → intent map…");
  const intentMap = await collectIntentMap();
  console.log(`[apply-intent-dnc] intents collected: ${intentMap.size}`);

  const stats = await applyIntents(intentMap);

  console.log("\nStep 2/3 Complete:");
  console.log(`- Intents collected: ${stats.intentsCollected}`);
  console.log(`- Phones with intent: ${stats.phonesWithIntent}`);
  console.log(`- Contacts updated: ${stats.contactsUpdated}`);
  console.log(`- Contacts not found: ${stats.contactsNotFound}`);
  console.log(`- DNC flagged: ${stats.dncApplied}`);
  console.log(`- Priority raised: ${stats.priorityRaised}`);
  console.log(`- smsAllowed set: ${stats.smsAllowedSet}`);
  console.log(`- callOnly set: ${stats.callOnlySet}`);
}

main()
  .catch(async (err) => {
    console.error("[apply-intent-dnc] failed", err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
