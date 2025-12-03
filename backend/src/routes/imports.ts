import { Router } from 'express';

export const importsRouter = Router();

// TODO: Re-implement using 'ImportService'
importsRouter.post('/dealmachine', (req, res) => {
  res.json({ message: 'Import endpoint ready for new logic' });
});
