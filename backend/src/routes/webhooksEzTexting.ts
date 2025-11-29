import { Router } from 'express';
import { prisma } from '../db';
// Using string fields for statuses/providers (schema uses string types in local dev)
import { normalizePhone } from '../utils/phone';
import { classifyReply, isStopKeyword } from '../utils/smsLogic';

export const webhooksEzTextingRouter = Router();

interface EzTextingWebhookBody {
  from?: string;
  to?: string;
  message?: string;
  campaignId?: string;
}

// Inbound EzTexting replies
webhooksEzTextingRouter.post('/inbound', async (req, res, next) => {
  try {
    const body = req.body as EzTextingWebhookBody;
    const phone = normalizePhone(body.from ?? '');
    const to = body.to ?? '';
    const text = body.message ?? '';
    const campaignId = body.campaignId ?? undefined;

    if (!phone) {
      console.warn('EzTexting inbound: invalid from phone', body.from);
      return res.json({ ok: true });
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
        provider: 'EZTEXTING',
        direction: 'INBOUND',
        contactId: contact.id,
        campaignId,
        fromNumber: phone,
        toNumber: to,
        body: text
      }
    });

    const target = await prisma.campaignTarget.findFirst({
      where: {
        contactId: contact.id,
        ...(campaignId ? { campaignId } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (target) {
      const newStatus: string = classifyReply(text, target.status as string);

      // STOP / DNC
      if (isStopKeyword(text)) {
        await prisma.dncEntry.upsert({
          where: { phoneE164: phone },
          update: {},
          create: { phoneE164: phone, reason: 'STOP via EzTexting' }
        });
      }

      const newStage = newStatus === 'REPLIED_POSITIVE' ? 'OFFICE' : (target.relationshipStage as string);

      await prisma.campaignTarget.update({
        where: { id: target.id },
        data: {
          status: newStatus,
          relationshipStage: newStage,
          lastInboundAt: new Date(),
          lastMessageId: msg.id
        }
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
