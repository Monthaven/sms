# Crown & Oak SMS – Apps Script (EZ Texting + Notion + Google Sheets)

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
