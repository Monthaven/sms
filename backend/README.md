# Backend Operator's Manual — Monthaven Acquisition Engine (MAE)

This doc is for the Engine runners. Heavy scripts run locally, feed Neon, and the Storefront on Vercel reads/presents.

## 1. Responsibilities
- Ingest massive DealMachine CSVs without timeouts.
- Launch EzTexting SMS campaigns.
- Capture telemetry (`IngestionJob`, `WebhookLog`) for the Storefront reports.
- Maintain the canonical Prisma schema (`backend/prisma/schema.prisma`) and push migrations to Neon.

## 2. Prerequisites
- Node 18+ (Node 24 verified), npm.
- Neon **direct** connection string stored in `backend/.env` (use pooled only on the frontend).
- EzTexting credentials (outbound SMS is EzTexting-only today). Twilio creds are fine to keep in env for health checks, but outbound Twilio paths are not implemented yet.
- Ability to run Prisma migrations locally (this environment cannot run interactive `migrate dev`).

## 3. Setup
```
powershell
cd backend
npm install
cp .env.example .env  # edit DATABASE_URL to direct Neon URL, add EZTEXTING creds if needed
```

From repo root, keep schemas in sync:
```
powershell
npm run db:sync  # copies backend Prisma schema -> frontend + regenerates clients
```

## 4. Operating the Engine
### CSV Ingestion
- Script: `backend/src/scripts/ingest.ts`
```
powershell
cd backend
npm run script:ingest -- ./path/to/dealmachine.csv CAMPAIGN_ID_OPTIONAL
```
- Streams the CSV, upserts contacts/properties, and (if `campaignId` given) creates leads with status NEW or QUEUED_FOR_CALL.
- Logs telemetry in `IngestionJob` (status, rows processed, leads created, durations).

### SMS Blast (EzTexting)
- Script: `backend/src/scripts/blast.ts`
```
powershell
cd backend
npm run script:blast
```
- Prompts for campaign name + message, prints preflight summary, requires typing `LAUNCH`.
- Syncs lead statuses to `SENT` and creates/updates the campaign row. Twilio outbound is not wired yet.

### Telemetry / Webhook Logs
- `IngestionJob` captures every ingest run.
- `WebhookLog` records inbound EzTexting (and future Twilio) webhook calls, including duplicates/errors.

### Legacy JSON ingest (parsed-extraction output)
Use this when importing the normalized `commercial_contacts.json` / `interactions_consolidated.json` / `dnc_full.csv` that live under `parsed-extraction/`.

```
powershell
cd backend
npm run script:import-staged -- ^
  --contacts ..\parsed-extraction\commercial_contacts.json ^
  --interactions ..\parsed-extraction\interactions_consolidated.json ^
  --dnc ..\parsed-extraction\dnc_full.csv ^
  --campaign "Legacy Multifamily 2024"
```

## 5. Prisma migrations
- Edit only `backend/prisma/schema.prisma`.
- Run locally: `cd backend && npx prisma migrate dev --name <change>` against Neon (or a local shadow DB).
- Commit the new `prisma/migrations/**`, then from repo root run `npm run db:sync` to copy schema to `/frontend` and regenerate both clients.
- If Neon already has data, follow Prisma's baseline guide before the first migration.

## 6. Troubleshooting
- **Prisma version mismatch:** ensure both backend/frontend use Prisma `5.22.0` (or the pinned version). Reinstall if CLI bumps to v7.
- **FK errors (P2003):** ensure the campaign exists, or run ingest without `campaignId` until one is created.
- **Webhook failures:** confirm the frontend `DATABASE_URL` points to the pooled Neon URL with `?pgbouncer=true`. Check `WebhookLog` rows for details.
- **Schema drift:** always run `npm run db:sync` after migrations so the Storefront stays aligned.

## 7. Handy commands
```
powershell
cd backend && npx prisma generate          # regenerate client
cd backend && npx prisma studio            # inspect DB via browser
npm run db:sync                            # copy schema + generate clients in both projects
```

For the full hybrid architecture (Engine + Storefront + Neon), see the root README.
