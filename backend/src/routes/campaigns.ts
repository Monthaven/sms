import { Router } from 'express';
import { prisma } from '../db';
import { z } from 'zod';
import { ezTextingClient } from '../eztextingClient';
// Use string values for provider/direction (schema uses strings in local dev)

export const campaignsRouter = Router();

const createCampaignSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  initialMessage: z.string().min(5)
});

// Create campaign with one initial message template
campaignsRouter.post('/', async (req, res, next) => {
  try {
    const data = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        description: data.description
      }
    });

    // Store template as a Message row
    await prisma.message.create({
      data: {
        provider: 'EZTEXTING',
        direction: 'OUTBOUND',
        body: data.initialMessage,
        fromNumber: 'TEMPLATE',
        toNumber: 'TEMPLATE',
        campaignId: campaign.id
      }
    });

    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

// Launch campaign via EzTexting
campaignsRouter.post('/:id/launch', async (req, res, next) => {
  try {
    const id = String(req.params.id);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        targets: { include: { contact: true } },
        messages: true
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const template = campaign.messages[0];
    if (!template) {
      return res.status(400).json({ error: 'No initial message template for campaign' });
    }

    // Build contact list for EzTexting
    const listId = await ezTextingClient.createContactList(`camp_${campaign.id}`);

    const contacts = campaign.targets
      .filter(t => !!t.contact)
      .map(t => ({
        phone: t.contact!.phoneE164,
        firstName: t.contact!.firstName ?? undefined,
        lastName: t.contact!.lastName ?? undefined
      }));

    await ezTextingClient.addContactsToList(listId, contacts);
    const ezCampId = await ezTextingClient.sendCampaign(listId, template.body);

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        eztextingListId: listId,
        eztextingCampId: ezCampId
      }
    });

    await prisma.campaignTarget.updateMany({
      where: { campaignId: campaign.id },
      data: {
        status: 'SENT',
        lastOutboundAt: new Date()
      }
    });

    res.json({
      ok: true,
      listId,
      ezCampId,
      sentTo: contacts.length
    });
  } catch (err) {
    next(err);
  }
});
