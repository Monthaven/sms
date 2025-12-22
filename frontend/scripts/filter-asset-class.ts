/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Filter MASTER_CONTACTS.csv to multifamily/commercial asset classes.
 * Run: npx ts-node scripts/filter-asset-class.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const ROOT = "C:\\Users\\Smooth King\\Downloads\\New folder (2)\\sms";
const INPUT = join(ROOT, "MASTER_CONTACTS.csv");
const OUTPUT = join(ROOT, "MASTER_CONTACTS_MF.csv");

type Row = Record<string, any>;

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

function resolveColumn(columns: string[], candidates: string[]): string | null {
  const lowerMap = new Map(columns.map((c) => [c.toLowerCase(), c]));
  for (const cand of candidates) {
    const found = lowerMap.get(cand);
    if (found) return found;
  }
  // fallback: partial match
  for (const c of columns) {
    const lc = c.toLowerCase();
    if (candidates.some((cand) => lc.includes(cand))) return c;
  }
  return null;
}

function getValue(row: Row, key: string | null): string | null {
  if (!key) return null;
  const v = row[key];
  if (v === undefined || v === null) return null;
  const s = `${v}`.trim();
  return s.length ? s : null;
}

async function run() {
  console.log(`Reading ${INPUT} ...`);
  const content = readFileSync(INPUT, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Row[];

  if (!records.length) {
    console.log("No rows found.");
    return;
  }

  const columns = Object.keys(records[0]);
  const propertyCol = resolveColumn(columns, ["property_class", "propertytype", "property_type", "property class", "property type"]);
  const landUseCol = resolveColumn(columns, ["land_use_code", "land_use", "landusecode", "zoning", "use_code", "land use"]);
  const unitCol = resolveColumn(columns, ["unit_count", "units", "num_units", "number_units", "unitcount"]);
  const phoneCol = resolveColumn(columns, ["phone", "phone1", "phone_1", "phonee164", "primary_phone"]);

  console.log("Detected columns:");
  console.log(`  property: ${propertyCol ?? "none"}`);
  console.log(`  land use: ${landUseCol ?? "none"}`);
  console.log(`  unit count: ${unitCol ?? "none"}`);
  console.log(`  phone: ${phoneCol ?? "none"}`);

  const keepClasses = ["MF", "COM", "IND", "LAND", "MIXED", "MULTIFAMILY", "COMMERCIAL", "INDUSTRIAL"];
  const dropClasses = ["SFR", "SINGLE FAMILY", "RESIDENTIAL"];
  const landKeepPrefixes = ["R-3", "R-4", "C-", "I-", "MF-"];
  const landDropSet = new Set(["R-1", "R-2", "RES", "SINGLE"]);

  let kept = 0;
  let dropped = 0;

  const filtered: Row[] = [];

  for (const row of records) {
    const propertyVal = getValue(row, propertyCol)?.toUpperCase() || null;
    const landVal = getValue(row, landUseCol)?.toUpperCase() || null;
    const unitRaw = getValue(row, unitCol);
    const units = unitRaw ? parseInt(unitRaw.replace(/\D/g, ""), 10) : NaN;

    let keep = false;
    let drop = false;

    if (propertyVal && keepClasses.some((k) => propertyVal.includes(k))) keep = true;
    if (propertyVal && dropClasses.some((k) => propertyVal.includes(k))) drop = true;

    if (landVal && landKeepPrefixes.some((p) => landVal.startsWith(p))) keep = true;
    if (landVal && landDropSet.has(landVal)) drop = true;

    if (!Number.isNaN(units) && units > 4) keep = true;
    if (!Number.isNaN(units) && units === 1 && !keep) drop = true;

    // Default drop if nothing indicates multifamily/commercial
    if (!keep && !drop) drop = true;

    if (keep) {
      kept++;
      // Ensure normalized phone is available for downstream dedupe if needed
      if (phoneCol) {
        const normalized = normalizePhone(row[phoneCol]);
        if (normalized) row._phoneNormalized = normalized;
      }
      filtered.push(row);
    } else {
      dropped++;
    }
  }

  console.log(`Total rows: ${records.length}`);
  console.log(`Kept (MF/Commercial): ${kept}`);
  console.log(`Dropped: ${dropped}`);

  const csv = stringify(filtered, { header: true, columns: Object.keys(filtered[0] || {}) });
  writeFileSync(OUTPUT, csv);
  console.log(`Written filtered file to ${OUTPUT}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
