import { Router } from 'express';

export const campaignsRouter = Router();

// TODO: Re-implement using new 'Lead' schema
campaignsRouter.get('/', (req, res) => {
  res.json({ message: 'Campaigns endpoint ready for new logic' });
});
