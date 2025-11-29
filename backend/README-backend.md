Quickstart — Backend (local dev)

This document shows how to run the backend locally for quick development and how to exercise the CSV import flow used in the repo README spec.

Prerequisites

- Node 18+ and npm
- Git checkout of this repo
- PowerShell (Windows) — commands below use PowerShell syntax

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
