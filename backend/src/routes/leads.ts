import { Router } from 'express';

export const leadsRouter = Router();

leadsRouter.get('/', (req, res) => {
  res.json({ message: 'Leads endpoint ready' });
});
