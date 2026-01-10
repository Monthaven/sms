/*
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Copyright (c) 2025 Always Improving LLC. All Rights Reserved.
 *
 * This software is the property of Always Improving LLC and is protected
 * under applicable intellectual property laws. Unauthorized copying,
 * modification, distribution, or use is strictly prohibited.
 *
 * Access to this code is provided under the terms of the Shareholders'
 * Agreement of Monthaven Capital Inc., section 8.3. No license is granted.
 */

# Backend Operator's Manual — Monthaven Acquisition Engine (MAE)

This is the Engine side of MAE: batch ingest, scoring, staging imports, and EzTexting blasts. It owns the canonical Prisma schema (`backend/prisma/schema.prisma`) that is synced to the frontend via `npm run db:sync`.

## What exists
- **Ingestion:** Streams DealMachine CSVs and stages legacy JSON into Properties/Contacts/Leads (`src/scripts/ingest.ts`, `import-staged.ts`).
- **Scoring & hygiene:** Contact scoring, owner-match normalization, intent+DNC application, and flag backfills (`score-contacts.ts`, `normalize-ownerMatch.ts`, `apply-intent-dnc.ts`, `backfill-flags.ts`).
- **Campaign ops (EzTexting):** Create campaigns and send blasts via EzTexting (`blast.ts`, `create-campaign.ts`); EzTexting client supports Basic auth or API key (`EZTEXTING_USER/PASS` or `EZTEXTING_API_KEY`).
- **Telemetry:** Ingestion and webhook logging persisted to Neon (`IngestionJob`, `WebhookLog`) for storefront dashboards.
- **Schema pipeline:** Backend schema is the source of truth; `npm run db:sync` copies it to `frontend/prisma/schema.prisma` and regenerates both Prisma clients.

## Gaps / TODO (high level)
- **DealMachine pull (new):** A pull CLI now exists (`script:pull-dealmachine`) with a generic DealMachine client. You may need to align API parameters/fields to your actual account (see inline notes). Ingest still lands via the existing CSV pipeline.
- **Twilio outbound from backend:** Twilio helper exists for office-line SMS, but blast/queue sending is EzTexting-only. Mirror `EzTextingClient` for Twilio if backend-driven sends are required.
- **Runtime server:** Package scripts reference `src/server.ts`, but no Express server is present—current surface is CLI scripts only. Add an API surface if you need backend webhooks or health endpoints here (storefront currently hosts webhooks).

See `DEALMACHINE_PULL_PLAN.md` for a concrete pull-design draft (implemented as a first cut here).

## Prerequisites
- Node.js 18+ (Node 24 verified), npm.
- Neon direct connection string in `backend/.env` (`DATABASE_URL` and `DIRECT_URL` both required by `env.ts`; use pooled only on the frontend).
- EzTexting credentials: either `EZTEXTING_USER`/`EZTEXTING_PASS` (Basic) or `EZTEXTING_API_KEY` (Bearer). Optional `EZTEXTING_API_BASE` (defaults to `https://a.eztexting.com/v1`).
- Twilio (optional): `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MAIN_FROM` for office-line tests.
- DealMachine pull (optional): `DEALMACHINE_API_KEY` required to run the pull, `DEALMACHINE_API_BASE` (defaults to `https://api.dealmachine.com`), `DEALMACHINE_PAGE_SIZE` (default 100).
- Optional import protection: `IMPORT_API_KEY` (checked by `middleware/apiKey.ts` if you add HTTP endpoints).

## Setup
```powershell
cd backend
npm install
cp .env.example .env  # fill DATABASE_URL/DIRECT_URL and messaging creds
```

Keep schemas in sync from the repo root:
```powershell
npm run db:sync  # copies backend Prisma schema to frontend and regenerates both clients
```

## Operations (CLI scripts)
- `npm run script:ingest -- <csvPath> [campaignId]`  
  Stream DealMachine CSV → contacts/properties/leads (NEW/QUEUED_FOR_CALL if campaign provided). Logs to `IngestionJob`.
- `npm run script:score-contacts`  
  Recompute decision-maker scores and flags on existing contacts.
- `npm run script:apply-intent-dnc`  
  Apply DNC/intent labels from interactions to contacts/leads.
- `npm run script:normalize-ownerMatch`  
  Normalize owner match flags across contacts.
- `npm run script:backfill-flags`  
  Fill derived flags that may be missing on historical rows.
- `npm run script:blast`  
  EzTexting blast: prompts for campaign name/message, requires `LAUNCH` confirmation; updates lead statuses.
- `npm run script:create-campaign`  
  Create a campaign shell row.
- `npm run script:pull-dealmachine -- --campaign <id> [--since <ISO>] [--limit <n>] [--dry-run]`  
  Pull contacts/properties from DealMachine API, build a temp CSV, and feed the ingest pipeline. `--dry-run` skips DB writes and leaves the staged CSV for inspection.
- `npm run script:import-staged -- --contacts <file> --interactions <file> --dnc <file> --campaign "<name>"`  
  Import normalized JSON/CSV from `parsed-extraction` style exports.

Supporting services live in `src/services/` and `src/utils/` (`phone.ts`, `smsLogic.ts`).

## Prisma & migrations
- Edit only `backend/prisma/schema.prisma`.
- Run: `cd backend && npx prisma migrate dev --name <change>` against Neon (or local shadow). Commit migrations.
- After migrations: run root `npm run db:sync` to propagate schema and regenerate Prisma clients in both projects.
- Inspect DB: `cd backend && npx prisma studio`.

## Troubleshooting
- **Prisma version drift:** Both apps pin Prisma `5.22.0`. Reinstall if CLI upgrades.
- **FK errors (P2003) on ingest:** Ensure campaign exists or omit `campaignId` so leads stay unassigned.
- **Missing creds:** Scripts that send via EzTexting require either `EZTEXTING_USER/PASS` or `EZTEXTING_API_KEY`.
- **Schema drift:** Always run `npm run db:sync` after migrations to keep the storefront aligned.

## Documentation consolidation
- This README is the canonical backend doc. Prior Markdown files are summarized here:
  - **README-backend.md:** Infra notes for spinning up temporary Postgres for migration dry-runs (docker recipe, prisma commands).
  - **DEV_NOTES.md:** Initial scaffolding log (local SQLite bootstrap, Prisma fixes, npm package adjustments).
  - **DEALMACHINE_PULL_PLAN.md:** Design/flow for DealMachine API pull script and mapping into ingest pipeline (logging, mapping, telemetry).
  - **PR-migration-instructions.md:** Safe flow to recreate Prisma migrations against Postgres with helper scripts and branch workflow.
