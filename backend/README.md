# Backend Operator's Manual — Monthaven Acquisition Engine (MAE)

This document describes how to operate the local "Engine" for Monthaven. The Engine runs locally (your laptop) and performs heavy compute tasks such as CSV ingestion and SMS blasts. The frontend (UI + webhooks) is hosted separately (e.g., Vercel).

Important: `backend/prisma/schema.prisma` is the source of truth for the DB schema. Use `npm run db:sync` from the repository root to copy the schema to `frontend/prisma` and generate Prisma clients for both projects.

Prerequisites
- Node.js 18+ (Node 24 is known to work in this workspace)
- npm
- Access to the Neon Postgres connection strings (Direct for local scripts, Pooled for Vercel)
- A `.env` file in `backend/` with `DATABASE_URL` configured (direct Neon connection)

Quick Setup
1. Install dependencies (backend):
```powershell
cd backend
npm install
```

2. Ensure `backend/.env` contains the proper `DATABASE_URL` (Direct connection):
```text
DATABASE_URL="postgres://user:pass@xyz.neon.tech/main?sslmode=require"
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
```

3. From repo root, sync Prisma schema and generate clients for frontend/backend:
```powershell
npm run db:sync
```

Ingestion (CSV import)
- Purpose: Import large DealMachine CSV files into the database. Uses streaming and works with large files.
- Script: `backend/src/scripts/ingest.ts`

Usage:
```powershell
cd backend
# Usage: npm run script:ingest <relative_csv_path> [campaign_id]
npm run script:ingest -- ./path/to/your-dealmachine.csv CAMPAIGN_ID_OPTIONAL
```

Notes:
- If you provide a `campaign_id`, leads will be associated with that campaign. Otherwise ingestion will still create contacts/properties but won't create campaign leads.
- The script will attempt to remove the input CSV when finished. Keep backups if needed.

Blast (Send SMS)
- Purpose: Create a campaign, upload contacts to EzTexting, and send a broadcast.
- Script: `backend/src/scripts/blast.ts`

Usage (interactive):
```powershell
cd backend
npm run script:blast
```

Behavior:
- The script prompts for a Campaign Name and a Message Body.
- It shows a pre-flight summary and requires typing `LAUNCH` to proceed.
- On success, local Lead records are updated to `SENT` and a Campaign record is created/updated.

Troubleshooting
- Prisma errors during `npm run db:sync`:
  - Ensure `prisma` and `@prisma/client` are pinned to v5 in `backend` and `frontend` or run `npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact` in both directories.
  - If you see schema validation errors mentioning Prisma v7, the project is using Prisma 5 schema constructs; pin to v5 as above.

- Ingest errors about missing `campaignId` or foreign key constraint (P2003):
  - Create the campaign before running the ingest or pass a valid campaign id to the ingest script.
  - You can create a campaign in the DB manually or use a helper script if available.

- Webhook testing:
  - Ensure the `frontend` deployment has `DATABASE_URL` set to your pooled Neon URL (include `?pgbouncer=true`).
  - Configure EzTexting/Twilio webhook URLs to point to your deployed frontend endpoints.

Developer Notes
- The authoritative Prisma schema lives at `backend/prisma/schema.prisma`. Do not edit `frontend/prisma/schema.prisma` directly.
- To add fields to the schema:
  1. Edit `backend/prisma/schema.prisma`.
  2. Run database migrations in `backend` (if needed):
     ```powershell
     cd backend
     npx prisma migrate dev --name add_some_field
     ```
  3. Run `npm run db:sync` from the repo root to copy the schema and generate clients.

Contact
- For operational questions, reach the repository owner or the engineering team managing the Neon database.

Thank you — this README completes the Operator's Manual for the local Engine.
