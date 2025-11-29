const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

(async () => {
  try {
    // 1) create a campaign for the import
    const campaign = await db.campaign.create({ data: { name: 'script-import-campaign', channel: 'EZTEXTING_BULK' } });
    console.log('Created campaign:', campaign.id);

    const csvPath = path.join(__dirname, '..', 'test-data', 'sample-dealmachine.csv');
    const csv = fs.readFileSync(csvPath, 'utf8');
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      console.log('CSV appears empty');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const idx = {
      address: headers.indexOf('Address'),
      city: headers.indexOf('City'),
      state: headers.indexOf('State'),
      zip: headers.indexOf('Zip'),
      ownerName: headers.indexOf('Owner Name'),
      phone: headers.indexOf('Phone')
    };

    let processed = 0;
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(c => c.trim());
      const rawPhone = cells[idx.phone] ?? '';
      const phone = normalizePhone(rawPhone);
      if (!phone) continue;

      const ownerName = cells[idx.ownerName] ?? '';
      const [firstName, ...rest] = ownerName.split(' ').filter(Boolean);
      const lastName = rest.join(' ') || null;

      const contact = await db.contact.upsert({
        where: { phoneE164: phone },
        update: {},
        create: { phoneE164: phone, firstName: firstName || null, lastName, source: 'DEALMACHINE_CSV' }
      });

      const property = await db.property.create({
        data: {
          ownerId: contact.id,
          addressLine1: cells[idx.address] ?? '',
          city: cells[idx.city] ?? '',
          state: cells[idx.state] ?? '',
          postalCode: cells[idx.zip] ?? '',
          externalSource: 'DealMachine'
        }
      });

      await db.campaignTarget.create({
        data: { campaignId: campaign.id, contactId: contact.id, propertyId: property.id, status: 'PENDING_SEND', relationshipStage: 'AUTOMATED' }
      });

      processed++;
    }

    console.log('Import finished. campaignId=', campaign.id, 'processed=', processed);
    const counts = { contacts: await db.contact.count(), properties: await db.property.count(), targets: await db.campaignTarget.count() };
    console.log('Counts after import:', counts);
  } catch (err) {
    console.error('Error in import script', err);
  } finally {
    await db.$disconnect();
  }
})();
