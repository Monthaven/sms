# Backend Operator’s Manual — Monthaven Acquisition Engine (MAE)

This doc is for the Engine runners. The workflow stays “mullet”: all heavy scripts run on your machine, feed Neon, and the Storefront on Vercel just reads/presents.

## 1. Responsibilities
- Ingest massive DealMachine CSVs without timeouts.
- Launch EzTexting SMS campaigns.
- Capture telemetry (`IngestionJob`, `WebhookLog`) for the Storefront’s reports.
- Maintain the canonical Prisma schema (`backend/prisma/schema.prisma`) and push migrations to Neon.

## 2. Prerequisites
- Node 18+ (Node 24 verified), npm.
- Neon **direct** connection string stored in `backend/.env`.
- EzTexting credentials (if blasting) and any other API secrets.
- Ability to run Prisma migrations locally (this environment can’t run interactive `migrate dev`).

## 3. Setup
```powershell
cd backend
npm install
cp .env.example .env  # edit DATABASE_URL to direct Neon URL, add EZTEXTING creds if needed
```

From repo root, keep schemas in sync:
```powershell
npm run db:sync  # copies backend Prisma schema -> frontend + regenerates clients
```

## 4. Operating the Engine
### CSV Ingestion
- Script: `backend/src/scripts/ingest.ts`
```powershell
cd backend
npm run script:ingest -- ./path/to/dealmachine.csv CAMPAIGN_ID_OPTIONAL
```
- Streams the CSV, upserts contacts/properties, and (if `campaignId` given) creates leads with status NEW or QUEUED_FOR_CALL.
- Logs telemetry in `IngestionJob` (status, rows processed, leads created, durations). Frontend reports consume these records.

### SMS Blast
- Script: `backend/src/scripts/blast.ts`
```powershell
cd backend
npm run script:blast
```
- Prompts for campaign name + message, prints preflight summary, requires typing `LAUNCH`.
- Syncs lead statuses to `SENT` and creates/updates the campaign row.

### Telemetry / Webhook Logs
- `IngestionJob` captures every ingest run.
- `WebhookLog` records inbound EzTexting (and upcoming Twilio) webhook calls, including duplicates/errors.
- These tables power `/dashboard/reports` and future admin telemetry views.

### Legacy JSON ingest (parsed-extraction output)
Use this when importing the normalized `commercial_contacts.json` / `interactions_consolidated.json` / `dnc_full.csv` that live under `parsed-extraction/`.

```powershell
cd backend
npm run script:import-staged -- ^
  --contacts ..\parsed-extraction\commercial_contacts.json ^
  --interactions ..\parsed-extraction\interactions_consolidated.json ^
  --dnc ..\parsed-extraction\dnc_full.csv ^
  --campaign "Legacy Multifamily 2024"
```

- `--contacts` *(required)*: path to the staged JSON file we generated in the earlier consolidation step.
- `--campaign` or `--campaignId` *(required)*: if the campaign name does not exist it will be created automatically.
- `--interactions` *(optional)*: imports the historical EzTexting replies into `Interaction` rows.
- `--dnc` *(optional)*: hydrates the `DncList` table with the scrubbed CSV.

The script is idempotent (upserts contacts/properties/leads/DNC rows) so you can re-run it after tweaking the staging files.

## 5. Prisma migrations (user action required)
- `backend/prisma/schema.prisma` is the only schema file you edit.
- This sandbox cannot run `prisma migrate dev`. To change schema:
  1. Run locally: `cd backend && npx prisma migrate dev --name <change>`
  2. Commit the new `prisma/migrations/**`
  3. `npm run db:sync` from repo root (copies schema to `/frontend` and regenerates Prisma clients)
- If Neon already has data, follow Prisma’s baseline guide before applying the first migration.

## 6. Troubleshooting
- **Prisma version mismatch:** Ensure both backend/frontend use Prisma `5.22.0`. Reinstall if CLI bumps to v7.
- **Ingest foreign key errors (P2003):** Ensure the campaign exists, or run the script without a `campaignId` until you create one.
- **Webhook failures:** Confirm the frontend’s `DATABASE_URL` points to the pooled Neon URL with `?pgbouncer=true`. Check `WebhookLog` rows for detailed errors.
- **Schema drift:** Always run `npm run db:sync` after migrations so the Storefront stays aligned.

## 7. Handy commands
```powershell
cd backend && npx prisma generate          # regenerate client
cd backend && npx prisma studio            # inspect DB via browser
npm run db:sync                            # copy schema + generate clients in both projects
```

Questions? Reach out to the repo owner or the Neon DB admins. For the complete hybrid architecture (Engine + Storefront + Neon), see the root README.***

## 8. Standard Database Workflow (Keep Neon as the Canonical Brain)
Follow this loop every time you touch the data layer so the Engine, Storefront, Metabase, and any future integrations all agree on the same schema and records.

1. **Prep & Access**
   - Store the Neon direct URL (admin role) in `backend/.env`; create separate read-only users for Metabase/other BI clients.
   - Snapshot/backup Neon before large imports so you can roll back a bad CSV or migration.

2. **Schema Changes**
   - Edit only `backend/prisma/schema.prisma`.
   - Run `cd backend && npx prisma migrate dev --name <change>` against Neon locally. Commit the new `prisma/migrations/**`.
   - From repo root, execute `npm run db:sync` so `/frontend/prisma` and both Prisma clients stay in sync.
   - Regenerate the frontend client (`cd frontend && npx prisma generate`) before `npm run build`.

3. **Data Imports / Seeding**
   - Use `script:ingest` for DealMachine CSVs and `script:import-staged` for the normalized JSON/CSV bundles under `parsed-extraction/`.
   - Each script writes to `IngestionJob`, `Contact`, `Property`, `Lead`, `DncList`, and optional `Interaction` tables so UI telemetry is instantaneous.
   - Keep a log (or Metabase dashboard) of which files were loaded, when, and under which campaign.

4. **Operational Telemetry**
   - Verify every ingest creates an `IngestionJob` row; failed runs must set `status=FAILED` with `errorMessage`.
   - Webhooks (EzTexting today, Twilio soon) must always insert into `WebhookLog` and update `Interaction`/`Lead` rows so dashboards show real-time health.

5. **Monitoring & BI**
   - Point Metabase (Docker container) to the Neon pooled connection using a read-only role; enable SSL.
   - Build dashboards for Ingestion throughput, Lead funnel, DNC trends, and Webhook success so Ops can audit without SQL.

6. **Troubleshooting Checklist**
   - If `prisma generate` fails, confirm migrations ran and `npm run db:sync` copied the schema.
   - If imports error on FK constraints, ensure the referenced Campaign/User rows exist or run the script without `campaignId` to create them.
   - If the Storefront shows stale data, flush React Query caches or re-run `npm run build` after syncing schema/clients.

Documenting and following this workflow keeps Neon “to standard,” ensures compliance/audit trails, and prevents mismatches between the Engine scripts, Vercel Storefront, and downstream analytics.
