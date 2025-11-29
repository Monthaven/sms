Quickstart — Backend (local dev)

This document shows how to run the backend locally for quick development and how to exercise the CSV import flow used in the repo README spec.

Prerequisites


![CI (Postgres)](https://github.com/Monthaven/sms/actions/workflows/ci-postgres.yml/badge.svg)
Local dev setup

1. Copy the example env and edit if needed:

```powershell
cd "C:\Users\Smooth King\Downloads\New folder (2)\sms\sms\backend"
cp .env.example .env
# Optionally edit .env to set real values. For local dev the default .env points DATABASE_URL to a sqlite dev.db
notepad .env
```

2. Install dependencies and generate Prisma client (SQLite local dev is configured by default):

```powershell
npm install
npx prisma generate --schema=prisma/schema_local.prisma
npx prisma migrate dev --schema=prisma/schema_local.prisma --name init
```

3. Start the dev server:

```powershell
npm run dev
# Server listens at http://localhost:4000
```

CSV import quick test (end-to-end)

The import endpoint expects a multipart form file upload with field name `file` and a query param `campaignId`.

1. Create a campaign and import a sample CSV (PowerShell):

```powershell
# Create a campaign (returns JSON with an `id`)
$camp = Invoke-RestMethod -Uri 'http://localhost:4000/api/campaigns' -Method Post -Body (ConvertTo-Json @{name='test-campaign'; initialMessage='Hello from test'}) -ContentType 'application/json'
$id = $camp.id
Write-Host "Campaign created: $id"

# Upload the sample CSV (adjust path if needed)
curl -s -X POST "http://localhost:4000/api/imports/dealmachine?campaignId=$id" -F "file=@C:\Users\Smooth King\Downloads\New folder (2)\sms\sms\backend\test-data\sample-dealmachine.csv"

# Fetch leads for the campaign
curl -s "http://localhost:4000/api/leads?campaignId=$id" | jq
```

Notes & next steps

- The local `.env` contains placeholder EzTexting / Twilio values. You can populate them to test integrations.
- For production use, replace the local SQLite datasource with your Neon Postgres URL and use `prisma migrate deploy` and the production `prisma/schema.prisma`.
- If you want, I can wire up additional endpoints or a small UI to review leads.

Idempotency & dedup behavior

- Imports are idempotent by default for the same phone/address combination.
- Contact records are upserted by `phoneE164` (phone normalized) and name fields are updated when provided.
- Properties are deduplicated by `ownerId + addressLine1 + city + state + postalCode` equality.
- Campaign targets are only created if a matching (campaignId, contactId, propertyId) triple does not already exist.

Postgres migration dry-run (local)

If you want to validate the Prisma migrations against Postgres locally, use the included PowerShell helper. It requires Docker Desktop.

Steps (PowerShell):

```powershell
cd 'C:\Users\Smooth King\Downloads\New folder (2)\sms\sms\backend'
# Start a transient Postgres container, run migrations, then remove it
.\scripts\postgres-dryrun.ps1
```

What the script does:
- Starts a `postgres:15` container named `monthaven-test-postgres` (on port 5432)
- Waits for the server to accept connections
- Runs `npx prisma generate` and `npx prisma migrate deploy --schema=prisma/schema.prisma` against the container
- Cleans up the container on success; leaves it running if deploy fails to aid debugging

If you'd rather run it manually with Docker:

```powershell
# Start container
docker run --name monthaven-test-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=monthaven -p 5432:5432 -d postgres:15

# Set env for local terminal
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/monthaven?schema=public'
$env:NODE_ENV = 'test'

# Generate client and deploy migrations
npx prisma generate --schema=prisma/schema.prisma
npx prisma migrate deploy --schema=prisma/schema.prisma

# Optionally run Prisma Studio
npx prisma studio --schema=prisma/schema.prisma

# Tear down
docker rm -f monthaven-test-postgres
```

Database constraints and indexes added

- To make deduplication robust at the database level, the following changes were applied to the Prisma schema and a corresponding migration SQL was added:
	- `Property` now has a unique constraint over `(ownerId, addressLine1, city, state, postalCode)` to prevent exact duplicate properties for the same owner.
	- `Property.ownerId` is indexed for faster owner->properties lookup.
	- `CampaignTarget` has indexes on `campaignId` and `contactId` to speed campaign lookups and joins.

These constraints help the import pipeline be idempotent even if the application-level dedupe misses a case.
