
# SMS Lead Management & Address Verification System

## Overview
This system automates the process of ingesting, classifying, verifying, and syncing SMS-based leads for real estate or similar workflows. It is designed for security, scalability, and integration with Notion and other CRMs.

## Features
- **Automated Address Verification:**
  - Batch processing of leads (50 at a time) using configurable providers (Google, USPS, Smarty, Lob).
  - Dry-run and provider modes for safe, cost-effective verification.
  - Outputs verified addresses in CSV/JSON, with audit logs and retry queues.

- **Lead Classification:**
  - Regex and ML-based classification (HOT/WARM/COLD, Commercial/SFH).
  - Confidence scoring and edge-case handling.

- **Data Enrichment & Sync:**
  - Fuzzy matching to expand property data sources.
  - Syncs enriched data to Notion/CRM with idempotency and error handling.

- **Automation & Reporting:**
  - Automated outreach workflows (campaigns, follow-ups, opt-outs).
  - Dashboard/reporting for pipeline and verification progress.

- **Security & Compliance:**
  - All secrets managed via environment variables (never committed).
  - .gitignore includes all sensitive and build files.
  - Git history is scrubbed of secrets.

## Folder Structure
```
├── address-verifier-runner.cjs
├── providers/
│   ├── google-geocode.cjs
│   └── smarty.cjs
├── data-quality-analyzer.cjs
├── ... (other scripts)
├── .env, local.env (ignored)
├── .gitignore
└── README.md
```

## Setup
1. **Clone the repository:**
   ```sh
   git clone https://github.com/Monthaven/sms.git
   cd sms
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in API keys and config.
   - Never commit secrets.
4. **Run address verification:**
   ```sh
   node address-verifier-runner.cjs --mode=provider --batch=50
   ```
5. **Import/export data as needed:**
   - Use CSV/JSON outputs for Notion or CRM import.

## Debugging & Development
- Use dry-run mode for safe testing.
- Check audit logs and retry queues for failed lookups.
- Add unit tests for new scripts and logic.
- Use `npm test` (when tests are implemented).

## Roadmap
- [ ] Refine HOT/WARM/COLD classifier (add ML, confidence, tests)
- [ ] Expand property data sources & fuzzy matching
- [ ] Sync enriched data to Notion/CRM
- [ ] Automated outreach workflows
- [ ] Dashboard & reporting
- [ ] CI, testing, and validation
- [ ] Deployment & scale plan

## Security
- All secrets must be in `.env` or `local.env` (never in code or git history).
- Rotate API keys if exposed.
- Use git-filter-repo for future history rewrites if needed.

---

## Legacy: Apps Script (EZ Texting + Notion + Google Sheets)

This repository previously included a GitHub Action driven workflow that ingests DealMachine CSV exports and orchestrates the full send pipeline (Notion upserts, EZ Texting delivery, and optional Google Sheet logging). See below for legacy instructions and Apps Script/Google Sheets integration details.

---
