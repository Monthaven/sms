/**
 * Consolidate all CSVs under the repo root by E.164 phone number.
 * One row per unique phone, merging non-null attributes across files.
 * Run: npx ts-node scripts/consolidate-csvs.ts
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename, resolve } from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

// Normalize to E.164 (+1XXXXXXXXXX) for US numbers
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

// Find all CSVs recursively
function findCsvs(dir: string): string[] {
  const results: string[] = [];
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findCsvs(fullPath));
    } else if (item.name.toLowerCase().endsWith(".csv")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Merge two records, keeping non-null/non-empty values (prefer newer/richer)
function mergeRecords(existing: Record<string, any>, incoming: Record<string, any>): Record<string, any> {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    const current = merged[key];
    const hasCurrent = current !== undefined && current !== null && `${current}`.trim() !== "" && `${current}`.trim() !== "null";
    const hasIncoming = value !== undefined && value !== null && `${value}`.trim() !== "" && `${value}`.trim() !== "null";
    if (!hasCurrent && hasIncoming) {
      merged[key] = value;
    }
  }
  return merged;
}

async function consolidate() {
  // Root of the repo (one level up from frontend)
  const ROOT = "C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms";

  console.log("Scanning for CSVs...");
  const csvFiles = findCsvs(ROOT);
  console.log(`Found ${csvFiles.length} CSV files\n`);

  const byPhone = new Map<string, Record<string, any>>();
  const allColumns = new Set<string>();
  const phoneColumns = [
    "phone",
    "phone1",
    "phone_1",
    "phonee164",
    "mobile",
    "cell",
    "contact_1_phone1",
    "contact_phone",
    "phone number",
  ];

  for (const csvPath of csvFiles) {
    console.log(`Processing: ${csvPath}`);
    try {
      const content = readFileSync(csvPath, "utf-8");
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, any>[];

      if (records.length === 0) continue;

      const columns = Object.keys(records[0]);
      columns.forEach((c) => allColumns.add(c));

      const phoneCol =
        columns.find((c) => phoneColumns.includes(c.toLowerCase())) ||
        columns.find((c) => phoneColumns.some((p) => c.toLowerCase().includes(p)));

      if (!phoneCol) {
        console.log("  ⚠️  No phone column found, skipping");
        continue;
      }

      let added = 0;
      let merged = 0;

      for (const row of records) {
        const rawPhone = row[phoneCol];
        const phone = normalizePhone(rawPhone);
        if (!phone) continue;

        row._source = basename(csvPath);
        row._phoneNormalized = phone;

        if (byPhone.has(phone)) {
          byPhone.set(phone, mergeRecords(byPhone.get(phone)!, row));
          merged++;
        } else {
          byPhone.set(phone, { ...row, _phoneNormalized: phone });
          added++;
        }
      }

      console.log(`  ✅ ${added} new, ${merged} merged`);
    } catch (err) {
      console.log(`  ❌ Error: ${err}`);
    }
  }

  console.log(`\n📊 Total unique phones: ${byPhone.size}`);
  console.log(`📊 Total columns observed: ${allColumns.size}`);

  const outputPath = join(ROOT, "MASTER_CONTACTS.csv");
  const rows = Array.from(byPhone.values());
  const finalColumns = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => finalColumns.add(k)));

  const csv = stringify(rows, {
    header: true,
    columns: Array.from(finalColumns).sort(),
  });

  writeFileSync(outputPath, csv);
  console.log(`\n✅ Written to: ${outputPath}`);
}

consolidate().catch((err) => {
  console.error(err);
  process.exit(1);
});
