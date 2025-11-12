# WEBHOOK DEPLOYMENT GUIDE - MONTHAVEN CAPITAL

## 🚀 Quick Setup (5 Minutes)

### Option 1: Manual CSV Import + Webhook (RECOMMENDED)
This avoids API permission issues and gets you running immediately.

#### Step 1: Create Databases in Notion (2 min)
1. Go to your "Unified SMS System - All Operations Hub" page
2. Create 3 new databases by typing `/database` and selecting "Table - Full page"
3. Name them exactly:
   - `SMS Command Center - Monthaven Capital`
   - `Single-Family Pipeline - Monthaven Capital`
   - `Compliance & Analytics - Monthaven Capital`

#### Step 2: Import Your Data (2 min)
1. In each database, click "Import" 
2. Upload the corresponding CSV:
   - SMS Command Center ← `notion-import-SMS-COMMAND-CENTER.csv`
   - Single-Family Pipeline ← `notion-import-SINGLE-FAMILY-PIPELINE.csv`
   - Compliance & Analytics ← `notion-import-COMPLIANCE-ANALYTICS.csv`

#### Step 3: Deploy Webhook (1 min)
1. Open Google Apps Script: https://script.google.com
2. Create new project
3. Paste contents of `ez-texting-webhook.gs`
4. Deploy as web app (Execute as: Me, Access: Anyone)
5. Copy the webhook URL

#### Step 4: Configure EZ Texting
1. In EZ Texting dashboard, go to Settings → Webhooks
2. Add your Google Apps Script URL
3. Enable events: incoming_message, opt_out, delivery_report

## 🎯 What This Gives You

### Real-time Response Processing
- **HOT**: "yes", "interested", "call me", "when can we meet"
- **WARM**: "maybe", "tell me more", "what's your offer"  
- **COLD**: "no", "not interested", "stop"

### Automatic Database Updates
- Response classification in Notion
- Handler assignment
- Next action recommendations
- Compliance protection

### Team Alerts
- Instant notifications for HOT leads
- Daily summaries
- Pipeline updates

## 📊 Your Data Ready to Import

You have 3 optimized CSV files ready:
- **29,153 contacts** for daily operations (SMS Command Center)
- **1,222 single-family** properties for acquisition focus
- **32,160 total records** with full compliance protection

## 🔧 Database Properties Auto-Configured

Each CSV includes expert-level segmentation:
- OperationalTier (T1-HOT-NOW, T1-WARM-PIPELINE, etc.)
- PropertyType, EstimatedValue, EquityPercent
- ComplianceStatus, ResponseHistory
- HandlerAssigned, NextAction

## ⚡ Ready to Deploy?

1. **Create the 3 databases** in your Notion page
2. **Import the CSVs** directly 
3. **Deploy the webhook** from ez-texting-webhook.gs
4. **Configure EZ Texting** webhook URL

This gets your entire 32,160-contact operation running with real-time intelligence in under 5 minutes.

Want me to walk you through any specific step?