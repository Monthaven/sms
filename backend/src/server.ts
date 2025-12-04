import express from 'express';
import cors from 'cors';
import { env } from './env';
import { campaignsRouter } from './routes/campaigns';
import { importsRouter } from './routes/imports';
import { leadsRouter } from './routes/leads';
import { webhooksEzTextingRouter } from './routes/webhooksEzTexting';
import { webhooksTwilioRouter } from './routes/webhooksTwilio';
import { authRouter } from './routes/auth'; // Import the auth router

const app = express();

// CORS + body parsers
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
app.use('/api/auth', authRouter); // <--- CRITICAL: This line registers the login route

// Webhooks
app.use('/webhooks/eztexting', webhooksEzTextingRouter);
app.use('/webhooks/twilio', webhooksTwilioRouter);

// Basic error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`Monthaven SMS backend listening on 0.0.0.0:${env.PORT}`);
});
