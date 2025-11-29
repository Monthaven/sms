import express from 'express';
import cors from 'cors';
import { env } from './env';
import { campaignsRouter } from './routes/campaigns';
import { importsRouter } from './routes/imports';
import { leadsRouter } from './routes/leads';
import { webhooksEzTextingRouter } from './routes/webhooksEzTexting';
import { webhooksTwilioRouter } from './routes/webhooksTwilio';
import { httpLogger } from './logger';

// attach request logger

const app = express();

// CORS + body parsers
app.use(httpLogger);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/imports', importsRouter);
app.use('/api/leads', leadsRouter);

// Webhooks
app.use('/webhooks/eztexting', webhooksEzTextingRouter);
app.use('/webhooks/twilio', webhooksTwilioRouter);

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    console.log(`Monthaven SMS backend listening on :${env.PORT}`);
  });
}

export default app;
