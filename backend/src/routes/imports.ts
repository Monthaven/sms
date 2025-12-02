import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db';
import { normalizePhone } from '../utils/phone';
import { parse } from 'csv-parse/sync';
import logger from '../logger';
import { requireApiKey } from '../middleware/apiKey';

const upload = multer();
export const importsRouter = Router();

// Expected CSV headers: Address, City, State, Zip, Owner Name, Phone
// Protect import endpoints with API key when configured
importsRouter.post('/dealmachine', requireApiKey, upload.single('file'), async (req, res, next) => {
  try {
    const campaignId = String(req.query.campaignId ?? '');
    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId required' });
    }
    // verify campaign exists
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ error: 'campaign not found' });
    if (!req.file) {
      return res.status(400).json({ error: 'file required' });
    }

    const csv = req.file.buffer.toString('utf8');
    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true
    });

    const requiredHeaders = ['Address', 'City', 'State', 'Zip', 'Owner Name', 'Phone'];
    const headersPresent = Object.keys(records[0] || {});
    for (const h of requiredHeaders) {
      if (!headersPresent.includes(h)) {
        return res.status(400).json({ error: `CSV missing header: ${h}` });
      }
    }

    const results: { row: number; ok: boolean; reason?: string }[] = [];
    let processed = 0;
    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2; // account for header line
      const rec = records[i];
      try {
        logger.info({ campaignId, row: rowNum }, 'processing import row');
        const rawPhone = String(rec['Phone'] ?? '');
        const phone = normalizePhone(rawPhone);
        if (!phone) {
          results.push({ row: rowNum, ok: false, reason: 'invalid_phone' });
          continue;
        }

        const ownerName = String(rec['Owner Name'] ?? '').trim();
        const [firstName, ...rest] = ownerName.split(' ').filter(Boolean);
        const lastName = rest.join(' ') || null;

        // Perform per-row work inside a Prisma transaction to ensure atomicity
        await prisma.$transaction(async (tx) => {
          const contact = await tx.contact.upsert({
            where: { phoneE164: phone },
            update: {
              // keep name fields if provided
              firstName: firstName || undefined,
              lastName: lastName || undefined
            },
            create: {
              phoneE164: phone,
              firstName: firstName || null,
              lastName,
              source: 'DEALMACHINE_CSV'
            }
          });

          // Try to find an existing property for this owner with the same normalized address
          const addrLine = String(rec['Address'] ?? '').trim();
          const city = String(rec['City'] ?? '').trim();
          const state = String(rec['State'] ?? '').trim();
          const postal = String(rec['Zip'] ?? '').trim();

          let property = await tx.property.findFirst({
            where: {
              ownerId: contact.id,
              addressLine1: addrLine,
              city,
              state,
              postalCode: postal
            }
          });

          if (!property) {
            property = await tx.property.create({
              data: {
                ownerId: contact.id,
                addressLine1: addrLine,
                city,
                state,
                postalCode: postal,
                externalSource: 'DealMachine'
              }
            });
          }

          // Avoid duplicate campaign targets for same campaign/contact/property
          const existingTarget = await tx.campaignTarget.findFirst({
            where: {
              campaignId,
              contactId: contact.id,
              propertyId: property.id
            }
          });

          if (!existingTarget) {
            await tx.campaignTarget.create({
              data: {
                campaignId,
                contactId: contact.id,
                propertyId: property.id,
                status: 'PENDING_SEND',
                relationshipStage: 'AUTOMATED'
              }
            });
          }
        });

        processed++;
        results.push({ row: rowNum, ok: true });
      } catch (err: any) {
        results.push({ row: rowNum, ok: false, reason: err?.message || 'error' });
      }
    }

    res.json({ campaignId, totalRows: records.length, processed, results });
  } catch (err) {
    next(err);
  }
});
