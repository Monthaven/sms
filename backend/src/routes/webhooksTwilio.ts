import { Router } from 'express';
import { prisma } from '../db';
// Using string fields for statuses/providers (schema uses string types in local dev)
import { normalizePhone } from '../utils/phone';

export const webhooksTwilioRouter = Router();

// Twilio inbound SMS
// Twilio sends application/x-www-form-urlencoded; Express urlencoded middleware handles this in server.ts
webhooksTwilioRouter.post('/sms', async (req, res, next) => {
  try {
    const { From, To, Body } = req.body as { From?: string; To?: string; Body?: string };

    const phone = normalizePhone(From ?? '');
    const to = To ?? '';
    const text = Body ?? '';

    if (!phone) {
      console.warn('Twilio inbound: invalid From', From);
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    let contact = await prisma.contact.findUnique({ where: { phoneE164: phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          phoneE164: phone,
          source: 'OTHER'
        }
      });
    }

    const msg = await prisma.message.create({
      data: {
        provider: 'TWILIO',
        direction: 'INBOUND',
        contactId: contact.id,
        fromNumber: phone,
        toNumber: to,
        body: text
      }
    });

    // Flip any automated targets for this contact into OFFICE / CONTACTED
    await prisma.campaignTarget.updateMany({
      where: {
        contactId: contact.id,
        relationshipStage: 'AUTOMATED'
      },
      data: {
        relationshipStage: 'OFFICE',
        status: 'CONTACTED',
        lastInboundAt: new Date(),
        lastMessageId: msg.id
      }
    });

    res.type('text/xml').send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});

// Twilio call webhook (basic status logging)
webhooksTwilioRouter.post('/call', async (req, res, next) => {
  try {
    const { From } = req.body as { From?: string };
    const phone = normalizePhone(From ?? '');
    if (!phone) {
      console.warn('Twilio call: invalid From', From);
      res.type('text/xml').send('<Response></Response>');
      return;
    }

    // Mark any targets as contacted & OFFICE
    await prisma.campaignTarget.updateMany({
      where: {
        contact: { phoneE164: phone }
      },
      data: {
        relationshipStage: 'OFFICE',
        status: 'CONTACTED'
      }
    });

    res.type('text/xml').send('<Response></Response>');
  } catch (err) {
    next(err);
  }
});
