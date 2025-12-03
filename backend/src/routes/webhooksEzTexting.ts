import { Router } from 'express';

export const webhooksEzTextingRouter = Router();

// Placeholder: Will handle inbound SMS replies from EzTexting
webhooksEzTextingRouter.post('/inbound', (req, res) => {
  console.log('EzTexting Webhook Received:', req.body);
  // TODO: Implement logic to update LeadStatus (STOP/HOT/WARM)
  res.json({ success: true });
});
