import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { prisma } from "../db";
import { normalizePhone } from "../utils/phone";

const ROOT_DIR = path.resolve(process.cwd(), "../..");

const ARGV = process.argv.slice(2);
const DRY_RUN = ARGV.includes("--dry-run");
const FORCE = ARGV.includes("--force");

function loadCsv(filePath: string, onRow: (row: any) => void) {
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => onRow(row))
      .on("end", () => resolve())
      .on("error", reject);
  });
}

function extractPhone(row: any) {
  return normalizePhone(
    row.Phone || row.phone || row.phoneE164 || row["Phone Number"] || row["Mobile Phone"] || row.contact_phone || row.contactPhone || row.mobile
  );
}

function extractFlagsRaw(row: any) {
  // Try common columns that may contain flags
  const candidates = [
    row.flags,
    row.Flags,
    row.flagsRaw,
    row.contact_flags,
    row["Contact Flags"],
    row["Contact_Flags"],
    row.contact_flags_raw,
    row.tags,
    row.Tags,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

async function findDealMachineFiles() {
  const files = fs.readdirSync(ROOT_DIR).filter((f) => {
    const lf = f.toLowerCase();
    return (lf.includes("dealmachine") || lf.includes("deal machine")) && lf.includes("contact") && lf.endsWith(".csv");
  });
  return files.map((f) => path.join(ROOT_DIR, f));
}

async function main() {
  console.log("[backfill-flags] ROOT_DIR:", ROOT_DIR);
  const files = await findDealMachineFiles();
  if (files.length === 0) {
    console.log("[backfill-flags] No DealMachine contact CSVs found in workspace root.");
    return;
  }

  console.log(`[backfill-flags] Found ${files.length} candidate file(s):`);
  files.forEach((f) => console.log("  -", path.basename(f)));

  const stats = {
    rowsRead: 0,
    phonesSeen: 0,
    contactsUpdated: 0,
    contactsNotFound: 0,
    skippedExisting: 0,
  };

  for (const file of files) {
    console.log(`[backfill-flags] Processing ${path.basename(file)}...`);
    await loadCsv(file, async (row) => {
      stats.rowsRead++;
      try {
        const phone = extractPhone(row);
        if (!phone) return;
        stats.phonesSeen++;
        const flagsRaw = extractFlagsRaw(row);
        if (!flagsRaw) return;

        const contact = await prisma.contact.findUnique({ where: { phoneE164: phone } });
        if (!contact) {
          stats.contactsNotFound++;
          return;
        }

        if (!FORCE && contact.flagsRaw && contact.flagsRaw.toString().trim()) {
          stats.skippedExisting++;
          return;
        }

        if (DRY_RUN) {
          console.log(`[DRY RUN] Would update ${phone} id=${contact.id} flagsRaw="${flagsRaw}" (existing=${Boolean(contact.flagsRaw)})`);
          stats.contactsUpdated++;
        } else {
          await prisma.contact.update({ where: { id: contact.id }, data: { flagsRaw } as any });
          stats.contactsUpdated++;
        }
      } catch (err) {
        console.warn('[backfill-flags] row processing failed', err);
      }
    });
  }

  console.log('\n[backfill-flags] Summary:');
  console.log(`  Rows read:           ${stats.rowsRead}`);
  console.log(`  Phones seen:         ${stats.phonesSeen}`);
  console.log(`  Contacts updated:    ${stats.contactsUpdated}`);
  console.log(`  Contacts not found:  ${stats.contactsNotFound}`);
  console.log(`  Skipped (existing):  ${stats.skippedExisting}`);
  if (DRY_RUN) console.log('\n[backfill-flags] This was a DRY RUN. No DB changes were made.');
}

main()
  .catch((err) => {
    console.error('[backfill-flags] ERROR', err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
