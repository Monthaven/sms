# Notion Prompt: Configure SMS Automation Credentials

Create a Notion page titled **"SMS Automation Credential Checklist"** that explains how to wire up the webhook-enabled SMS workflow. Structure the page with the following sections and content:

1. **Overview**
   - Briefly describe that the workflow integrates Google Apps Script, EZ Texting webhooks, GitHub Actions, and Notion databases to process inbound/outbound SMS messages from DealMachine CSV exports.

2. **GitHub / GitHub Actions Secrets**
   - Provide a table with columns `Secret Name`, `Purpose`, and `Required?` covering:
     - `NOTION_TOKEN` – Notion integration token – Required
     - `NOTION_DB_LEADS` – Leads database ID – Required
     - `NOTION_DB_BATCHES` – Campaign batches database ID – Optional
     - `EZTEXTING_USER` – EZ Texting username or OAuth key – Required
     - `EZTEXTING_PASSWORD` – EZ Texting password or secret – Required
     - `GOOGLE_SA_JSON` – Google service account JSON with private key – Optional (for logging to Sheets)
     - `GSHEETS_PARENT_FOLDER_ID` – Google Drive folder ID for log spreadsheets – Optional
     - `MESSAGE_TEMPLATE` – Default outbound SMS template – Optional
     - Mention that optional runtime flags `BATCH_SIZE`, `QUIET_HOURS`, `CSV_PATH`, and `DRY_RUN` can also be set as env vars for local runs.

3. **Google Apps Script Properties (Webhook + Scheduled Jobs)**
   - List each script property with short explanations:
     - `HOLDER_SPREADSHEET_ID` – Primary Google Sheet ID (required)
     - `BULK_DATA_SPREADSHEET_ID` – Optional archive Sheet
     - `NOTION_TOKEN`, `LEAD_STAGING_DB`, `CAMPAIGN_BATCHES_DB`, `THREAD_TRACKING_DB`, `PROCESSING_QUEUE_DB` – Notion integration token and database IDs
     - `EZ_USER`, `EZ_PASS` – EZ Texting OAuth client credentials
     - `GLOBAL_PAUSE_SMS`, `USE_SHEETS_SOURCE` – Optional feature flags
   - Note that these values power both scheduled Apps Script functions and the `doPost`/`doGet` webhook handlers.

4. **Deployment Steps**
   - Outline the steps to publish the Apps Script as a web app:
     1. Open Apps Script → Deploy → Manage Deployments.
     2. Create or edit a deployment, set **Execute as: Me**, **Who has access: Anyone**.
     3. Deploy and copy the Web App URL.
     4. Paste the URL into the EZ Texting inbound and delivery webhook settings.
   - Mention no extra shared-secret validation is required because the handler accepts EZ Texting callbacks directly.

5. **Optional CI Automation**
   - Document that `.github/workflows/deploy.yml` can push Apps Script changes via `clasp` and requires repository secrets `CLASPRC_JSON` and `GAS_SCRIPT_ID`.
   - Emphasize these are only needed for automated deployments, not for the webhook itself.

6. **Local Development Tips**
   - Remind readers to load the same environment variables when running `node ops/pipeline.js` locally.
   - Suggest storing secrets in a `.env` file or local secrets manager and never committing them to the repo.

Finish with a short checklist encouraging the user to confirm every secret/property is populated before testing the webhook.
