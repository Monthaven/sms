# Crown & Oak SMS – Apps Script (EZ Texting + Notion + Google Sheets)

## DealMachine CSV → Notion + EZ Texting pipeline

This repository now includes a GitHub Action driven workflow that ingests DealMachine CSV exports and orchestrates the full send pipeline (Notion upserts, EZ Texting delivery, and optional Google Sheet logging).

### How it works

1. Commit a DealMachine CSV into `campaigns/inputs/`.
2. Trigger **Actions → DealMachine CSV → Run workflow**. Pick the CSV path and whether to run as a dry run.
3. The action runs `ops/pipeline.js`, which:
   - parses, normalizes, and dedupes leads (phone → E.164),
   - creates/updates a batch + leads in Notion,
   - optionally creates a per-campaign Google Sheet log (if Google credentials are provided),
   - sends (or previews) SMS messages via EZ Texting,
   - polls delivery and writes the results back to Notion and the log.

Preview-only runs create a JSON artifact under `campaigns/reports/` that the workflow surfaces for download.

### Required GitHub secrets

Add the following repository secrets before running the workflow:

| Secret | Purpose |
| --- | --- |
| `NOTION_TOKEN` | Notion API token |
| `NOTION_DB_LEADS` | Target Notion database for leads |
| `NOTION_DB_BATCHES` | (Optional) Notion database for batch records |
| `EZTEXTING_API_BASE` | EZ Texting API base URL |
| `EZTEXTING_API_KEY` | EZ Texting API key/token |
| `GOOGLE_SA_JSON` | (Optional) Google service-account JSON for Sheets logging |
| `GSHEETS_PARENT_FOLDER_ID` | (Optional) Drive folder to store per-campaign logs |
| `MESSAGE_TEMPLATE` | SMS template (supports `${FirstName}` and `${StreetAddress}`) |

Dry-run submissions still require Notion access to create/update staging rows. Skip Google secrets to disable Sheet creation.

### Local testing

```bash
npm install
node ops/pipeline.js --csv campaigns/inputs/sample.csv --dry-run true
```

Provide env vars (e.g., via a `.env` loader or inline) when testing real sends.

---

Production-ready Google Apps Script that:
- Pulls/filters leads from Sheets (or Notion) and sends SMS via EZ Texting
- Updates Notion "Lead Staging" + "Campaign Batches"
- Tracks delivery + inbound via webhook and delivery polling
- Handles suppression/DNC and bulk status updates

## Prereqs

- Node 18+ and `npm`
- `clasp` globally: `npm i -g @google/clasp`
- A Google Apps Script project (we'll create via clasp)
- A Google Sheet (holder): **HOLDER_SPREADSHEET_ID**
- (Optional) Bulk CSV spreadsheet: **BULK_DATA_SPREADSHEET_ID**
- Notion internal integration token + DBs
  - **LEAD_STAGING_DB**, **CAMPAIGN_BATCHES_DB** (and optionally **THREAD_TRACKING_DB**, **PROCESSING_QUEUE_DB**)
- EZ Texting app key/secret (OAuth) and account

## Install

```bash
git clone <your-repo-url>
cd crown-oak-sms
npm install
```

Create the Apps Script project (or link an existing one):

```bash
# login interactive
clasp login
# create a standalone script
clasp create --title "Crown & Oak SMS" --type standalone
# or if you already have a scriptId, set it in .clasp.json
```

Push:

```bash
npm run push
npm run open
```

## Script Properties (required)

In the Apps Script editor: Project Settings → Script Properties and add:

- `HOLDER_SPREADSHEET_ID` – your holder sheet id
- `BULK_DATA_SPREADSHEET_ID` – (optional) bulk/DealMachine sheet id
- `NOTION_TOKEN` – `secret_<...>` Notion internal integration token
- `LEAD_STAGING_DB` – Notion DB id (32 hex, with/without dashes)
- `CAMPAIGN_BATCHES_DB` – Notion DB id
- `THREAD_TRACKING_DB` – (optional)
- `PROCESSING_QUEUE_DB` – (optional)
- `EZ_USER` – EZ Texting app key
- `EZ_PASS` – EZ Texting app secret
- (optional) `GLOBAL_PAUSE_SMS` – set to `true` to pause all sends
- (optional) `USE_SHEETS_SOURCE` – set to `true` to source leads from your holder sheet tab

> ⚠️ Do **not** put secrets into code or Git!

## First run / setup

1. Open the script → Run → `onOpen` once to install the Sheets menu.
2. In the menu **DM Tools**:
   - (optional) Build EZ contacts: “Build EZ Contacts (from DM CSV)”
   - Enable “Auto Send” if desired (every 15 minutes).
3. In Notion Campaign Batches, create a campaign and set:
   - `Status = Queued`
   - `Message Template` = your SMS template (supports `${FirstName}` and `${StreetAddress}`)
   - `Target Count` = max recipients
4. (Optional) Publish a web app for inbound/delivery webhooks:
   - Deploy → Manage deployments → New deployment → Web app
   - Execute as: Me; Who has access: Anyone
   - Copy the URL and put it in your EZ Texting webhook settings.

## Handy functions

- `executeCampaignSend()` – runs the next queued campaign (respects quiet hours)
- `dryRunCampaignQueued()` – prints who/what would be messaged
- `setupDeliveryProcessingTriggers()` – installs a 5-min poll of delivery sheet
- `processCurrentResponses()` – maps inbound classifications → Notion statuses

## CI (optional)

Use the workflow in `.github/workflows/deploy.yml`. Add secrets:

- `CLASPRC_JSON` – contents of your local `~/.clasprc.json`
- `GAS_SCRIPT_ID` – your Apps Script id

Trigger manually (`workflow_dispatch`) to push from GitHub.

## Notes

- Never commit access tokens. Use Script Properties (or GitHub Secrets in CI).
- If Notion property names differ, adjust `CONFIG.NOTION.PROPS` or change the filter keys.
- Quiet hours default to 9pm–8am; set in `CONFIG`.

## Sanity-check workflow

1. In Notion Campaign Batches, set a campaign to `Status = Queued`, fill `Message Template` and `Target Count`.
2. In Apps Script, run `dryRunCampaignQueued()` — verify phones and messages look right.
3. Run `executeCampaignSend()` — watch `Campaign_Log` and `Delivery_Status` start filling.
4. Optionally keep `USE_SHEETS_SOURCE = true` to pull from your `Filter_SendReady` tab instead of Notion leads; the dry-run respects that too.

If anything else feels off, tell me which DB property names differ in your Notion, and I’ll tailor the exact keys to your schema.
