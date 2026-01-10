/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 *
 * Pull property leads from DealMachine API, filter by property type,
 * and import into SMS campaigns.
 *
 * Excludes: SFR, manufactured homes, condos, townhouses
 * Accepts: Multifamily, commercial, land, other
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import minimist from 'minimist';
import { prisma } from '../db';
import { normalizePhone } from '../utils/phone';
import { DealMachineClient } from '../services/dealMachineClient';
import { DealMachineLead } from '../services/dealMachineTypes';
import { normalizeAssetType } from '../services/criteriaFilter';
import logger from '../logger';
import { ImportService } from '../services/importService';

/**
 * CSV header columns matching ImportService expectations
 * These match the format used by the existing DealMachine CSV import
 */
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
  // Contact slots (1..20)
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

/**
 * Escape a value for CSV format
 */
function asCsvValue(value: any): string {
  const str = value === undefined || value === null ? '' : String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Map a DealMachine lead to a CSV row
 * Converts property lead data to the format expected by ImportService
 */
function mapLeadToRow(lead: DealMachineLead) {
  const phones = lead.phone_numbers || [];
  const emails = lead.email_addresses || [];

  // Build contact slots (up to 20 phone numbers)
  const slots: Array<{
    name: string;
    phone: string;
    phoneType: string;
    email?: string;
  }> = [];

  const ownerName = lead.owner_name || 'Unknown Owner';
  const seen = new Set<string>();

  for (const phone of phones) {
    const normalized = normalizePhone(phone.phone_number);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);

    slots.push({
      name: ownerName,
      phone: normalized,
      phoneType: phone.type || 'Unknown',
      email: emails[0], // Associate first email with each phone
    });

    if (slots.length >= 20) break;
  }

  // Build CSV row
  const row: Record<string, string> = {
    property_address_line_1: lead.property_address_line1 || '',
    property_address_city: lead.property_address_city || '',
    property_address_state: lead.property_address_state || '',
    property_address_zipcode: lead.property_address_zip || '',
    property_latitude: '', // Not provided in lead API
    property_longitude: '',
    property_parcel_id: '',
    property_dealmachine_id: lead.id || '',
    property_updated_at: lead.updated_at || '',
  };

  // Fill contact slots
  for (let i = 0; i < 20; i++) {
    const slot = slots[i];
    const n = i + 1;
    row[`contact_${n}_name`] = slot?.name || '';
    row[`contact_${n}_phone1`] = slot?.phone || '';
    row[`contact_${n}_phone1_type`] = slot?.phoneType || '';
    row[`contact_${n}_phone2`] = ''; // Unused
    row[`contact_${n}_email1`] = slot?.email || '';
  }

  return { row, hasPhone: slots.length > 0 };
}

/**
 * Write a row to the CSV file
 */
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
    boolean: ['dry-run', 'full'],
    alias: { c: 'campaign' },
  });

  const campaignId = args.campaign as string | undefined;
  const since = args.since as string | undefined;
  const limit = args.limit ? Number(args.limit) : undefined;
  const dryRun = Boolean(args['dry-run']);
  const fullSync = Boolean(args.full);

  // Validate arguments
  if (!campaignId && !dryRun) {
    console.error('Error: --campaign <id> is required unless you pass --dry-run');
    process.exit(1);
  }

  if (since && fullSync) {
    console.error('Error: Cannot specify both --since and --full');
    process.exit(1);
  }

  console.log('Starting DealMachine leads pull...');
  console.log('Campaign:', campaignId || '(dry-run)');
  console.log('Since:', since || fullSync ? '(full sync)' : '(all leads)');
  console.log('Limit:', limit || 'none');
  console.log('Filter: Excluding SFR, manufactured, condo, townhouse');

  // Validate campaign exists (unless dry-run)
  if (!dryRun && campaignId) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      console.error(`Error: Campaign ${campaignId} not found`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  // Create IngestionJob
  const ingestionJob = await prisma.ingestionJob.create({
    data: {
      id: `dmleads-${Date.now()}`,
      fileName: 'dealmachine-leads-api',
      source: 'dealmachine-api',
      campaignId: campaignId || null,
      status: 'RUNNING',
      startedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log(`Created IngestionJob: ${ingestionJob.id}`);

  const stats = {
    fetched: 0,
    excluded: 0,
    accepted: 0,
    skipped_no_phone: 0,
    skipped_no_address: 0,
    written: 0,
  };

  try {
    // Initialize DealMachine client and fetch leads
    const client = new DealMachineClient();
    const leads: DealMachineLead[] = [];

    console.log('Fetching leads from DealMachine API...');

    for await (const lead of client.iterateLeads({ since, limit })) {
      stats.fetched += 1;

      // Log progress every 100 leads
      if (stats.fetched % 100 === 0) {
        console.log(`  Fetched ${stats.fetched} leads...`);
      }

      leads.push(lead);
    }

    console.log(`✓ Fetched ${stats.fetched} leads from DealMachine API`);

    // Filter leads by property type (exclude SFR, manufactured, condo, townhouse)
    const acceptedLeads: DealMachineLead[] = [];

    for (const lead of leads) {
      const assetType = normalizeAssetType(lead.property_type?.label || '');
      if (assetType === null) {
        stats.excluded += 1;
        continue; // Skip excluded property types
      }

      acceptedLeads.push(lead);
    }

    stats.accepted = acceptedLeads.length;
    console.log(`✓ ${stats.accepted} leads accepted after filtering property types`);

    // Write to CSV
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'dmleads-'));
    const csvPath = path.join(tmpDir, 'dealmachine_leads.csv');
    const writer = fs.createWriteStream(csvPath, { encoding: 'utf8' });

    // Write CSV header
    writer.write(HEADER_COLUMNS.join(',') + '\n');

    console.log('Writing accepted leads to CSV...');

    for (const lead of acceptedLeads) {
      const { row, hasPhone } = mapLeadToRow(lead);

      // Skip if no address
      if (!row.property_address_line_1) {
        stats.skipped_no_address += 1;
        continue;
      }

      // Skip if no phone
      if (!hasPhone) {
        stats.skipped_no_phone += 1;
        continue;
      }

      await writeCsvRow(writer, row);
      stats.written += 1;
    }

    await new Promise<void>((resolve) => writer.end(resolve));

    console.log(`✓ Wrote ${stats.written} leads to CSV`);

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Fetched from API: ${stats.fetched}`);
    console.log(`Excluded (property type): ${stats.excluded}`);
    console.log(`Accepted: ${stats.accepted}`);
    console.log(`Skipped (no phone): ${stats.skipped_no_phone}`);
    console.log(`Skipped (no address): ${stats.skipped_no_address}`);
    console.log(`Written to CSV: ${stats.written}`);

    if (dryRun) {
      console.log('\n✓ Dry run complete. CSV staged at:', csvPath);
      await prisma.ingestionJob.update({
        where: { id: ingestionJob.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          rowsProcessed: stats.fetched,
          updatedAt: new Date(),
        },
      });
      await prisma.$disconnect();
      return;
    }

    if (stats.written === 0) {
      console.error('\n✗ No leads to import. All leads were filtered out or missing contact info.');
      await prisma.ingestionJob.update({
        where: { id: ingestionJob.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: 'No leads passed property type filter or had valid contact info',
          updatedAt: new Date(),
        },
      });
      await prisma.$disconnect();
      process.exit(1);
    }

    // Import via ImportService
    console.log('\nImporting leads into campaign...');
    await ImportService.processDealMachineCsv(csvPath, campaignId, ingestionJob.id);

    // Update IngestionJob (ImportService updates contactsCreated/leadsCreated)
    await prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
        rowsProcessed: stats.fetched,
        updatedAt: new Date(),
      },
    });

    console.log('\n✓ Import completed successfully!');

    logger.info('DealMachine leads pull complete', {
      campaignId,
      ingestionJobId: ingestionJob.id,
      ...stats,
    });

    // Cleanup
    try {
      if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
      if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  } catch (error: any) {
    console.error('\n✗ Error:', error.message);

    // Update IngestionJob with failure
    await prisma.ingestionJob.update({
      where: { id: ingestionJob.id },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        errorMessage: error.message,
        updatedAt: new Date(),
      },
    });

    logger.error('DealMachine leads pull failed', { error });

    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
