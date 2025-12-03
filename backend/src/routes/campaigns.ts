import { Router } from 'express';
import { CampaignService } from '../services/campaignService';

export const campaignsRouter = Router();

// Health / info
campaignsRouter.get('/', (_req, res) => {
  res.json({ message: 'Campaigns endpoint ready for new logic' });
});

// POST /api/campaigns/launch
campaignsRouter.post('/launch', async (req, res, next) => {
  try {
    const { name, message } = req.body;
    if (!name || !message) {
      return res.status(400).json({ error: 'name and message are required' });
    }

    const result = await CampaignService.launchBlast(String(name), String(message));
    res.json(result);
  } catch (err) {
    next(err);
  }
});
