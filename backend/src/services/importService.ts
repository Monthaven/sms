import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../db';
import { normalizePhone } from '../utils/phone';
import { IngestionJobStatus, LeadStatus } from '@prisma/client';

interface DealMachineRow {
  [key: string]: string; 
}

export class ImportService {
  
  static async processDealMachineCsv(filePath: string, campaignId?: string, ingestionJobId?: string) {
    const results: DealMachineRow[] = [];
    
    // Stats for reporting back to UI
    let stats = { 
      rowsProcessed: 0, 
      contactsCreated: 0, 
      leadsCreated: 0, 
      mobilesFound: 0, 
      landlinesFound: 0 
    };

    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log(`Starting Deep Trace on ${results.length} properties...`);
          
          try {
            for (const row of results) {
              try {
                await this.processDeepTraceRow(row, campaignId, stats);
              } catch (err) {
                console.error(`Error processing row:`, err);
              }
            }

            if (ingestionJobId) {
              await prisma.ingestionJob.update({
                where: { id: ingestionJobId },
                data: {
                  status: IngestionJobStatus.SUCCESS,
                  rowsProcessed: stats.rowsProcessed,
                  contactsCreated: stats.contactsCreated,
                  leadsCreated: stats.leadsCreated,
                  finishedAt: new Date(),
                  durationSeconds: Math.floor((Date.now() - startedAt) / 1000),
                },
              });
            }

            // Cleanup temp file
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
            
            console.log("Import Complete:", stats);
            resolve({ success: true, stats });
          } catch (error) {
            if (ingestionJobId) {
              await prisma.ingestionJob.update({
                where: { id: ingestionJobId },
                data: {
                  status: IngestionJobStatus.FAILED,
                  errorMessage: (error as Error).message,
                  finishedAt: new Date(),
                  durationSeconds: Math.floor((Date.now() - startedAt) / 1000),
                },
              });
            }
            reject(error);
          }
        })
        .on('error', (err) => reject(err));
    });
  }

  private static async processDeepTraceRow(row: DealMachineRow, campaignId: string | undefined, stats: any) {
    // 1. Identify Property (The Anchor)
    const address = row['property_address_line_1'];
    const city = row['property_address_city'];
    const state = row['property_address_state'];
    const zip = row['property_address_zipcode'];

    // Skip rows with no valid address
    if (!address) return; 
    stats.rowsProcessed++;

    // 2. Create/Update Property
    // We store the FULL row in rawDetails so we never lose data (Mortgage, Equity, Roof, etc.)
    const property = await prisma.property.upsert({
      where: {
        addressLine1_city_state: {
          addressLine1: address,
          city: city || '',
          state: state || '',
        }
      },
      update: { 
        postalCode: zip,
        rawDetails: row as any // Update mostly just raw data if exists
      },
      create: {
        addressLine1: address,
        city: city || '',
        state: state || '',
        postalCode: zip || '',
        rawDetails: row as any,
      }
    });

    // 3. Loop Through Contact Slots (1 to 20)
    for (let i = 1; i <= 20; i++) {
      // DealMachine headers: contact_1_phone1, contact_1_name, etc.
      const phoneRaw = row[`contact_${i}_phone1`] || row[`contact_${i}_phone2`];
      const nameRaw = row[`contact_${i}_name`];
      const typeRaw = row[`contact_${i}_phone1_type`] || 'Unknown'; // e.g. "Landline", "Wireless", "VoIP"
      const emailRaw = row[`contact_${i}_email1`];

      if (!phoneRaw) continue; // Slot empty

      const phoneE164 = normalizePhone(phoneRaw);
      if (!phoneE164) continue; // Invalid number

      // 4. Upsert Contact
      // If contact exists, we update their type/email but keep existing names
      const nameParts = (nameRaw || '').split(' ');
      const firstName = nameParts[0] || undefined;
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const contact = await prisma.contact.upsert({
        where: { phoneE164 },
        update: {
          phoneType: typeRaw,
          email: emailRaw || undefined
        },
        create: {
          phoneE164,
          phoneType: typeRaw,
          firstName,
          lastName,
          email: emailRaw,
          source: 'DEALMACHINE_DEEP'
        }
      });
      stats.contactsCreated++;

      // 5. Determine Routing (Mobile vs Landline)
      const isMobile = typeRaw.toLowerCase().includes('wireless') || typeRaw.toLowerCase().includes('mobile');
      
      if (isMobile) stats.mobilesFound++;
      else stats.landlinesFound++;

      // 6. Create Lead (Link Contact <-> Property <-> Campaign)
      if (campaignId) {
        // ACTION: If Mobile -> NEW (EzTexting). If Landline -> QUEUED_FOR_CALL (Manual).
        const initialStatus = isMobile ? LeadStatus.NEW : LeadStatus.QUEUED_FOR_CALL;

        await prisma.lead.upsert({
          where: {
            campaignId_contactId_propertyId: {
              campaignId,
              contactId: contact.id,
              propertyId: property.id
            }
          },
          update: {}, // Don't reset status if lead already exists
          create: {
            campaignId,
            contactId: contact.id,
            propertyId: property.id,
            status: initialStatus
          }
        });
        stats.leadsCreated++;
      }
    }
  }
}
