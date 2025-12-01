import express from 'express';
import cors from 'cors';
import { env } from './env';
import { prisma } from './db';
import { register } from './metrics';
import { campaignsRouter } from './routes/campaigns';
import { importsRouter } from './routes/imports';
import { importRateLimiter } from './middleware/rateLimiter';
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

app.get('/health', async (_req, res) => {
  // Basic health: app + DB connectivity
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('db_timeout')), 2000));
    const check = prisma.$queryRawUnsafe('SELECT 1');
    await Promise.race([check, timeout]);
    res.json({ ok: true, db: 'ok' });
  } catch (err) {
    const reason = String((err as any)?.message ?? err);
    res.status(503).json({ ok: false, db: 'unavailable', reason });
  }
});

app.get('/metrics', async (_req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).send(`metrics error: ${err?.message ?? err}`);
  }
});

// API routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/imports', importRateLimiter, importsRouter);
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
  // Attempt to connect to DB early so startup failures are visible in logs
  prisma
    .$connect()
    .then(() => console.log('Prisma connected'))
    .catch((err) => console.error('Prisma connection failed on startup:', err));

  const host = '0.0.0.0';
  const server = app.listen(env.PORT, host, () => {
    console.log(`Monthaven SMS backend listening on ${host}:${env.PORT}`);
  });

  // Global handlers to make crashes visible in the console during development
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
}

export default app;
