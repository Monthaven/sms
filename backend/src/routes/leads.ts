import { Router } from 'express';
import { prisma } from '../db';

export const leadsRouter = Router();

// GET /api/leads?campaignId=...&status=REPLIED_POSITIVE
leadsRouter.get('/', async (req, res, next) => {
  try {
    const { campaignId, status } = req.query;
    const where: any = {};

    if (campaignId) where.campaignId = String(campaignId);
    if (status) where.status = String(status);

    const targets = await prisma.campaignTarget.findMany({
      where,
      include: {
        contact: true,
        property: true,
        campaign: true
      }
    });

    res.json(targets);
  } catch (err) {
    next(err);
  }
});
