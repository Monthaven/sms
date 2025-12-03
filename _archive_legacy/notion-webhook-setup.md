# Monthaven Capital - Notion Webhook Setup

## Overview
Complete webhook integration for real-time SMS response processing and database management.

## Webhook Architecture

### 1. EZ Texting → Google Apps Script → Notion
```
Incoming SMS → EZ Texting Platform → Webhook URL → Google Apps Script → Notion Database
```

### 2. Manual Database Import
- Import CSV files directly to Notion (recommended for bulk data)
- Webhook handles real-time updates only

## Setup Steps

### Step 1: Create Notion Databases Manually
1. In your "Unified SMS System - All Operations Hub" page
2. Create 3 databases with these exact titles:
   - `SMS Command Center - Monthaven Capital`
   - `Single-Family Pipeline - Monthaven Capital` 
   - `Compliance & Analytics - Monthaven Capital`

### Step 2: Import CSV Data
Use these files to import data directly in Notion:
- `notion-import-SMS-COMMAND-CENTER.csv` (29,153 contacts)
- `notion-import-SINGLE-FAMILY-PIPELINE.csv` (1,222 contacts)
- `notion-import-COMPLIANCE-ANALYTICS.csv` (32,160 contacts)

### Step 3: Deploy Webhook
1. Copy `ez-texting-webhook.gs` to Google Apps Script
2. Deploy as web app
3. Configure EZ Texting webhook URL

### Step 4: Configure Real-time Updates
Webhook will automatically:
- Classify responses (HOT/WARM/COLD)
- Update Notion records
- Trigger team alerts
- Handle opt-outs

## Webhook URL Structure
```
https://script.google.com/macros/s/{SCRIPT_ID}/exec
```

## Expected Benefits
- ✅ Real-time response classification
- ✅ Automatic database updates  
- ✅ Team alert system
- ✅ Compliance protection
- ✅ No API permission issues

## Database Schemas
Each database includes:
- Contact information
- Property intelligence
- Response history
- Operational tiers
- Compliance status

Ready to proceed with webhook deployment?