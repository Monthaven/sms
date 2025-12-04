Here is the definitive README.md for the Monthaven Acquisition Engine (MAE). It reflects the new Hybrid Architecture where heavy processing happens locally ("The Engine") and availability is handled by Vercel ("The Storefront").

Replace the contents of your root README.md with this.

Monthaven Acquisition Engine (MAE)
Status: ACTIVE | Version: 3.0.0 (Hybrid Architecture)

1. Executive Summary
The Monthaven Acquisition Engine (MAE) is a hybrid real estate acquisition platform. It separates high-compute batch processing from high-availability user interaction.

The Problem: Large CSV imports and SMS blasts (10k+ records) cause timeouts on serverless platforms like Vercel/AWS Lambda.

The Solution: We run "The Engine" locally to handle heavy lifting without time limits, while "The Storefront" (UI) lives on the cloud to catch leads 24/7.

2. System Architecture
A. The Brain (Database)
Technology: Neon (Serverless Postgres).

Role: The Single Source of Truth. Both the local engine and the cloud UI connect to this same database.

B. The Engine (Local Backend)
Location: /backend

Runtime: Node.js (Local Machine) via ts-node.

Responsibilities:

Ingestion: Parses massive DealMachine CSVs using streams.

Blasting: Orchestrates bulk SMS campaigns via EzTexting API.

Deep Trace: Deeply inspects contact records (up to 20 slots per property).

C. The Storefront (Cloud Frontend)
Location: /frontend

Runtime: Next.js 14 (Deployed on Vercel).

Responsibilities:

The Net: Catches inbound SMS webhooks (replies) 24/7.

Command Center: Provides the "Inbox" and "Call Queue" for agents to close deals.

Visuals: Real-time dashboard of lead statuses.

3. Directory Structure
Plaintext

/
├── backend/               # THE ENGINE (Local Scripts)
│   ├── prisma/            # SCHEMA MASTER (Source of Truth)
│   ├── src/
│   │   ├── services/      # Business Logic (Import, Campaign)
│   │   └── scripts/       # Executable Entry Points (Ingest, Blast)
│   └── .env               # Local Env (Direct DB Connection)
│
├── frontend/              # THE STOREFRONT (Vercel)
│   ├── app/
│   │   ├── dashboard/     # Agent UI
│   │   └── api/           # Webhook Endpoints
│   ├── prisma/            # Copy of Schema (Synced)
│   └── .env               # Vercel Env (Pooled DB Connection)
4. Setup Guide
Phase 1: Database (Neon)
Create a Project in Neon.

Get two connection strings:

Direct Connection: For backend (migrations/scripts).

Pooled Connection: For frontend (Vercel serverless).

Phase 2: Environment Variables
backend/.env

Bash

DATABASE_URL="postgres://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
frontend/.env (and Vercel Environment Variables)

Bash

# MUST use the Pooled connection (pgbouncer=true)
DATABASE_URL="postgres://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
Phase 3: Installation & Sync
Run this from the root directory to install dependencies and sync the database schema.

Bash

# 1. Install Dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Sync Schema (Backend is Master -> Pushes to Frontend)
npm run db:sync 
# (Note: Ensure you have added the 'db:sync' script to root package.json)
5. Operations Playbook
Workflow A: Ingest Data (Local)
Process a DealMachine CSV file. This runs locally, so files can be 500MB+ without timing out.

Bash

cd backend
# Usage: npm run script:ingest <relative_path_to_csv> <optional_campaign_id>
npx ts-node src/scripts/ingest.ts "../data/leads_nov_2025.csv" "CAMP_NOV_A"
Workflow B: Launch Campaign (Local)
Trigger a mass SMS blast to all leads with status NEW.

Bash

cd backend
# Interactive Mode
npx ts-node src/scripts/blast.ts
Prompts you for Campaign Name and Message Body.

Requires explicit "LAUNCH" confirmation.

Workflow C: The "Catch" (Webhooks)
When a lead replies, EzTexting hits your Vercel deployment.

Configure EzTexting: Set Keyword "Reply URL" to https://your-project.vercel.app/api/webhooks/eztexting.

Logic:

Vercel receives POST.

Finds Lead by Phone Number.

Updates Status (RESP_HOT, RESP_STOP).

Logs interaction to Interaction table.

6. Development Guidelines
The Golden Rule of Schema
backend/prisma/schema.prisma is the Master.

Never edit the frontend schema manually.

Always edit backend schema, then run npm run db:sync to propagate changes to the frontend client.

Adding New Features
Data Model: Modify backend/prisma/schema.prisma.

Migration: cd backend && npx prisma migrate dev.

Sync: cp backend/prisma/schema.prisma frontend/prisma/schema.prisma.

Generate: cd frontend && npx prisma generate.

Build UI: Now you can use the new fields in Next.js.