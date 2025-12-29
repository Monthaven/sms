/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 *
 * Pull contacts/properties from DealMachine API and feed the existing CSV ingest pipeline.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import minimist from 'minimist';
import { prisma } from '../db';
import { normalizePhone } from '../utils/phone';
import { DealMachineClient, DealMachineContact } from '../services/dealMachineClient';
import logger from '../logger';
import { ImportService } from '../services/importService';

interface ContactSlot {
  name?: string;
  phone?: string;
  phoneType?: string;
  email?: string;
}

const HEADER_COLUMNS = [
  'property_address_line_1',
  'property_address_city',
  'property_address_state',
  'property_address_zipcode',
  'property_latitude',
  'property_longitude',
  'property_parcel_id',
  'property_dealmachine_id',
  'property_updated_at',
  // contact slots (1..20)
  ...Array.from({ length: 20 }).flatMap((_, idx) => {
    const n = idx + 1;
    return [
      `contact_${n}_name`,
      `contact_${n}_phone1`,
      `contact_${n}_phone1_type`,
      `contact_${n}_phone2`,
      `contact_${n}_email1`,
    ];
  }),
];

function asCsvValue(value: any): string {
  const str = value === undefined || value === null ? '' : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildSlots(contact: DealMachineContact): ContactSlot[] {
  const fullName =
    contact.fullName ||
    contact.ownerName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
    undefined;

  const phoneSource =
    (Array.isArray(contact.phones) && contact.phones) ||
    (Array.isArray(contact.phoneNumbers) && contact.phoneNumbers) ||
    [];

  const seen = new Set<string>();
  const slots: ContactSlot[] = [];

  for (const phone of phoneSource) {
    const normalized = normalizePhone(phone.number);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    slots.push({
      name: fullName,
      phone: normalized,
      phoneType: phone.type || phone.label || 'Unknown',
      email: contact.email || contact.emails?.[0],
    });
    if (slots.length >= 20) break;
  }

  // If no phones, still return empty to allow caller to skip
  return slots;
}

function mapContactToRow(contact: DealMachineContact) {
  const property = (contact.property ?? {}) as NonNullable<DealMachineContact['property']> &
    Record<string, any>;
  const slots = buildSlots(contact);

  const row: Record<string, string> = {
    property_address_line_1: property.address1 || '',
    property_address_city: property.city || '',
    property_address_state: property.state || '',
    property_address_zipcode: property.postalCode || '',
    property_latitude: property.latitude !== undefined ? String(property.latitude) : '',
    property_longitude: property.longitude !== undefined ? String(property.longitude) : '',
    property_parcel_id: property.parcelId || '',
    property_dealmachine_id: contact.id || '',
    property_updated_at: contact.updatedAt || '',
  };

  for (let i = 0; i < 20; i++) {
    const slot = slots[i];
    const n = i + 1;
    row[`contact_${n}_name`] = slot?.name || '';
    row[`contact_${n}_phone1`] = slot?.phone || '';
    row[`contact_${n}_phone1_type`] = slot?.phoneType || '';
    row[`contact_${n}_phone2`] = ''; // unused, kept for CSV compatibility
    row[`contact_${n}_email1`] = slot?.email || '';
  }

  return { row, hasPhone: slots.length > 0 };
}

async function writeCsvRow(writer: fs.WriteStream, row: Record<string, string>) {
  const values = HEADER_COLUMNS.map((key) => asCsvValue(row[key] ?? ''));
  return new Promise<void>((resolve, reject) => {
    writer.write(values.join(',') + '\n', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    string: ['campaign', 'since', 'limit'],
    boolean: ['dry-run'],
    alias: { c: 'campaign' },
  });

  const campaignId = args.campaign as string | undefined;
  const since = args.since as string | undefined;
  const limit = args.limit ? Number(args.limit) : undefined;
  const dryRun = Boolean(args['dry-run']);

  if (!campaignId && !dryRun) {
    console.error('Error: --campaign <id> is required unless you pass --dry-run');
    process.exit(1);
  }

  const client = new DealMachineClient();
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dm-pull-'));
  const csvPath = path.join(tmpDir, 'dealmachine_pull.csv');
  const writer = fs.createWriteStream(csvPath, { encoding: 'utf8' });

  // Header
  writer.write(HEADER_COLUMNS.join(',') + '\n');

  const stats = {
    fetched: 0,
    written: 0,
    skippedMissingProperty: 0,
    skippedNoPhone: 0,
  };

  try {
    for await (const contact of client.iterateContacts({ since, limit })) {
      stats.fetched += 1;
      const { row, hasPhone } = mapContactToRow(contact);

      if (!row.property_address_line_1) {
        stats.skippedMissingProperty += 1;
        continue;
      }
      if (!hasPhone) {
        stats.skippedNoPhone += 1;
        continue;
      }

      await writeCsvRow(writer, row);
      stats.written += 1;
    }
  } finally {
    await new Promise<void>((resolve) => writer.end(resolve));
  }

  logger.info('DealMachine pull summary', { csvPath, ...stats });

  if (dryRun) {
    console.log('Dry run complete. CSV staged at:', csvPath);
    await prisma.$disconnect();
    return;
  }

  if (!stats.written) {
    console.error('No rows written; aborting ingest');
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    await ImportService.processDealMachineCsv(csvPath, campaignId);
    logger.info('DealMachine pull ingested successfully', { campaignId, written: stats.written });
  } catch (err) {
    logger.error('DealMachine ingest failed', { err });
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    // ImportService tries to delete the file; best-effort cleanup here too.
    try {
      if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch (e) {
      // ignore
    }
  }
}

main().catch(async (err) => {
  console.error('Fatal DealMachine pull error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
