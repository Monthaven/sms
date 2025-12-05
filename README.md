# Monthaven Acquisition Engine (MAE)

**Status:** ACTIVE | **Version:** 3.0.0 (Hybrid Architecture)

## 1. Executive Summary
The Monthaven Acquisition Engine (MAE) is a hybrid real estate acquisition platform. It separates **high-compute batch processing** from **high-availability user interaction**.

* **The Problem:** Large CSV imports and SMS blasts (10k+ records) cause timeouts on serverless platforms like Vercel/AWS Lambda.
* **The Solution:** We run "The Engine" locally to handle heavy lifting without time limits, while "The Storefront" (UI) lives on the cloud to catch leads 24/7.

## 2. System Architecture

### A. The Brain (Database)
* **Technology:** Neon (Serverless Postgres).
* **Role:** The Single Source of Truth. Both the local engine and the cloud UI connect to this same database.

### B. The Engine (Local Backend)
* **Location:** `/backend`
* **Runtime:** Node.js (Local Machine) via `ts-node`.
* **Responsibilities:**
    * **Ingestion:** Parses massive DealMachine CSVs using streams.
    * **Blasting:** Orchestrates bulk SMS campaigns via EzTexting API.
    * **Deep Trace:** Deeply inspects contact records (up to 20 slots per property).

### C. The Storefront (Cloud Frontend)
* **Location:** `/frontend`
* **Runtime:** Next.js 14 (Deployed on Vercel).
* **Responsibilities:**
    * **The Net:** Catches inbound SMS webhooks (replies) 24/7.
    * **Command Center:** Provides the "Inbox" and "Call Queue" for agents to close deals.
    * **Visuals:** Real-time dashboard of lead statuses.

---

## 3. Directory Structure

```text
/
 backend/               # THE ENGINE (Local Scripts)
    prisma/            # SCHEMA MASTER (Source of Truth)
    src/
       services/      # Business Logic (Import, Campaign)
       scripts/       # Executable Entry Points (Ingest, Blast)
    .env               # Local Env (Direct DB Connection)

 frontend/              # THE STOREFRONT (Vercel)
    app/
       dashboard/     # Agent UI
       api/           # Webhook Endpoints
    prisma/            # Copy of Schema (Synced)
    .env               # Vercel Env (Pooled DB Connection)
```

## 4. Setup Guide

### Phase 1: Database (Neon)
Create a Project in Neon.

Get two connection strings:

* Direct Connection: For backend (migrations/scripts).
* Pooled Connection: For frontend (Vercel serverless).

### Phase 2: Environment Variables

`backend/.env`

```text
DATABASE_URL="postgres://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
```

`frontend/.env` (and Vercel Environment Variables)

```text
# MUST use the Pooled connection (pgbouncer=true)
DATABASE_URL="postgres://user:pass@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
```

### Phase 3: Installation & Sync
Run this from the root directory to install dependencies and sync the database schema.

```powershell
# 1. Install Dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Sync Schema (Backend is Master -> Pushes to Frontend)
npm run db:sync
```

## 5. Operations Playbook

### Workflow A: Ingest Data (Local)
Process a DealMachine CSV file. This runs locally, so files can be 500MB+ without timing out.

```powershell
cd backend
# Usage: npm run script:ingest <relative_path_to_csv> <optional_campaign_id>
npx ts-node src/scripts/ingest.ts "../data/leads_nov_2025.csv" "CAMP_NOV_A"
```

### Workflow B: Launch Campaign (Local)
Trigger a mass SMS blast to all leads with status NEW.

```powershell
cd backend
# Interactive Mode
npx ts-node src/scripts/blast.ts
```

Prompts you for Campaign Name and Message Body. Requires explicit `LAUNCH` confirmation.

### Workflow C: The "Catch" (Webhooks)
When a lead replies, EzTexting hits your Vercel deployment.

Configure EzTexting: Set Keyword "Reply URL" to `https://your-project.vercel.app/api/webhooks/eztexting`.

Logic:

* Vercel receives POST.
* Finds Lead by Phone Number.
* Updates Status (RESP_HOT, RESP_STOP).
* Logs interaction to Interaction table.

## 6. Development Guidelines

### The Golden Rule of Schema
`backend/prisma/schema.prisma` is the Master.

Never edit the frontend schema manually.

Always edit backend schema, then run `npm run db:sync` to propagate changes to the frontend client.

### Adding New Features

1. Data Model: Modify `backend/prisma/schema.prisma`.
2. Migration: `cd backend && npx prisma migrate dev --name add_some_field`.
3. Sync: `npm run db:sync`.
4. Generate: `cd frontend && npx prisma generate`.
5. Build UI: Use the new fields in Next.js.

---

### 4. Comparison vs. "Legacy"
* **Old:** You had `server.ts` trying to run an Express API.
* **New:** `server.ts` is gone. You run `npx ts-node src/scripts/ingest.ts`.
* **Old:** You had a `backend/frontend` folder causing confusion.
* **New:** You have one clear `frontend/` folder for Vercel.
* **Old:** You had manual DB sync issues.
* **New:** You have `npm run db:sync`.

**Status:** Once you apply these 4 cleanups, the architecture is **Locked**.

---

## 7. Storefront Upgrade Roadmap
The UI in `/frontend` currently uses mocked data and visual stubs so we can design quickly. The next pass hardens the Storefront so it reflects Neon truth, enforces access, and exposes the Engine’s health in real time.

### 7.1 Data Plumbing (Prisma + React Query)
| Goal | Action Items | Dependencies |
| --- | --- | --- |
| Replace mocks with real data | - Implement `/frontend/app/api/{leads,campaigns,agents,automations,integrations}` that proxy Prisma<br>- Move fetching to React Query/SWR hooks for cache + polling<br>- Surface loading/empty/error states in all tables | `backend/prisma/schema.prisma` (source of truth), Neon DB connectivity |
| Keep Engine & Storefront aligned | - Continue to run `npm run db:sync` after schema edits<br>- For local dev, seed Neon via `/backend` scripts so dashboards show live rows | `/backend` ingestion scripts |

> _Perfect is the target:_ until these routes are live the UI uses `lib/mocks.ts`. Track this gap so we know when “perfect” (real data) is achieved.

### 7.2 Authentication & Session Enforcement
- Add `middleware.ts` in `/frontend` to guard `/dashboard/**` routes; redirect to `/` when `mae_user` cookie missing.
- Create `lib/auth.ts` with `currentUser()` helper that fetches the agent record (roles, availability) via Prisma.
- Replace mock agent presence with DB-driven presence signals; include multi-agent status in Sidebar, TopBar, and Accept buttons.
- Add logout confirmation + optional session expiration banner.

### 7.3 Twilio Integration (Stubs Now, Full Later)
Current state: Integrations screen shows Twilio as “disconnected”, and `/app/api/integrations/twilio/route.ts` returns static JSON.

Next steps (documented but not yet implemented):
1. Validate `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (frontend + backend).
2. Store encrypted credentials (likely via Vercel env for Storefront, `.env` for Engine).
3. Add webhook handler (`/api/webhooks/twilio`) parallel to EzTexting.
4. Implement outbound messaging path (Engine fallback + Storefront action).
5. Stream integration health/logs into the Integrations page.

Keep the stub in place until Twilio credentials are provisioned.

### 7.4 Telemetry: Webhooks + Ingestion
- Reports currently show static numbers. Replace with live ingestion job feed (read from Prisma `IngestionJob` or similar once schema exists).
- Surface webhook successes/failures (EzTexting + future Twilio) with timestamps and retry buttons.
- Add Engine/Storefront heartbeat indicators (CLI ping + Vercel uptime) so Ops can confirm both halves are online.

### 7.5 Navigation & Layout Polish
To hit “cutting-edge CRM” quality:
- **Top Navigation:** Add a slim top bar with only the primary modules (Dashboard, Queue, Admin, Reports) plus an account/avatar button.
- **Secondary Navigation:** Use a pill-style sub-menu (side or bottom) for context-specific tabs (e.g., Admin subsections: Campaigns, Agents, Automations, Integrations). Each page should render a “module pill” footer summarizing the current scope.
- **Breadcrumb/Banner:** Each admin page should show breadcrumb text (e.g., `Admin › Campaigns`) and a small CTA pill referencing `/backend` or `/frontend` when cross-coordination is required.
- **404 / Error Boundaries:** Hook the new branded 404 into Next.js error boundary support so pre-rendered pages and dynamic routes both fall back gracefully.

### 7.6 Additional Items to Monitor
- **Prisma migrations (user action required):** `npx prisma migrate dev` cannot run in this CI sandbox. Run schema changes locally (`cd backend && npx prisma migrate dev --name <change>`), baseline Neon if needed, then commit the generated migration folder and push. After that, run `npm run db:sync` so `/frontend` stays aligned.
- **Multi-Agent Assignment:** Accept/Snooze buttons now hit the server action but still need agent selection, audit trails, and optimistic notifications.
- **Outbound Webhooks:** Expand `/backend` to push status changes to Next.js (or use polling) so dashboards stay fresh without manual refresh.
- **Docs:** Keep this roadmap synchronized with `frontend/docs/ui-ux-plan.md` so contributors know what is shipped vs pending.

Remember the architecture split:
- `/backend` (local) is the Engine you run via `ts-node`.
- `/frontend` (Vercel) is the Storefront that agents see.
- Neon remains the shared “brain.” Always align schema changes there before exposing them in UI.

---

## 8. Data Flow Blueprint · Storefront UI/UX
This section describes *exactly* how the UI will be populated once the Prisma-backed routes and hooks are live. Treat it as a contract between the Engine, Storefront, and Neon. Anything listed here must be instrumented before we consider the UI “production ready.”

### 8.1 `/dashboard` (Teammate Command Center)
**Audience:** Closers, callers, SMS agents.

**Primary modules & data sources**
| Surface | Data Source | Notes |
| --- | --- | --- |
| KPI Tiles (Active conversations, Queued for call, Outbound reach, Total leads) | `prisma.lead` aggregated by status | Use React Query hook that polls every 30s; fallback to SWR revalidation when server action mutates. Include trend arrows (last 24h) and tooltips referencing ingestion jobs. |
| Inbox Radar (Hot & Warm threads + table) | `/api/leads?status=RESP_HOT/RESP_WARM/CONVERSATION_ACTIVE/SENT` | Table needs: sort by `updatedAt`, filter by campaign, owner pill, last interaction preview, timezone aware timestamps. CTA buttons: Reply (opens chat), Accept, Snooze, Assign. |
| Lead takeovers / Accept buttons | `LeadActionButtons` calling server action + optimistic toast | Display ownership (assigned agent + avatar), SLA badge (time since response). Accept assigns to current agent; Snooze stores `followUpAt`; Assign opens modal listing agents. |
| Agent Presence | `prisma.agent` or unified `user` table with status + lastHeartbeat | Replace mock array with query showing online/away/offline, leads count, and ability to ping/notify an agent. |
| Call Queue | `/api/leads?status=QUEUED_FOR_CALL` | Show dialer ready badge, phone type, property summary, and CTAs: Call now (set `CONVERSATION_ACTIVE`), Reschedule (set to `SENT` with `followUpAt`), Assign closer. |
| Chat Thread `/dashboard/chat/[id]` | `getLeadDetails()` (server action) returning lead + interactions | Timeline sorted ascending; replies call `sendReplyAction`; include macros dropdown, channel badge (EzTexting/Twilio), and CTA to update status or push to call queue. |
| Notifications/Toasts | Toast provider (Next.js or custom) | Fire toasts for Accept/Snooze/Reply successes, show inline error banners when server action fails or when webhook health is degraded. |
| Pill footer | Derived metadata (last fetch time, dataset) | Example: `Data · Neon · RESP_HOT (24) · refreshed 09:31:05 UTC`. Remind agents of source + refresh cadence. |

**User journey**
1. Agent logs in -> middleware verifies cookie + role -> loads `/dashboard`.
2. React Query fetches KPIs, inbox leads, queue leads, and presence concurrently (display skeletons until resolved).
3. Accept/Snooze/Assign buttons call server action -> update `lead.status`, `assignedAgentId`, optional `followUpAt` -> React Query invalidates caches + toast confirms.
4. Chat reply -> `sendReplyAction` inserts `interaction`, updates status, revalidates `/dashboard` + `/dashboard/chat/[id]`.
5. Queue interactions behave similarly but include dialer state + call notes; CTA to mark as spoken pushes to `CONVERSATION_ACTIVE`.
6. Agent presence heartbeat updates every 15 seconds via background mutation; offline agents fade after grace period.

**Future Enhancements**
- Add macros/templates + canned responses in ReplyComposer.
- Integrate presence into Accept button (show latest agent, escalate to supervisor when SLA breached).
- Introduce pill navigation at bottom (dataset summary) and CTA to “Launch Engine” for escalations.

### 8.2 `/dashboard/admin/*` (Full Admin Suite)
**Audience:** Operations leads, system owners.

**Modules & data population**
| Route | Dataset | Capabilities |
| --- | --- | --- |
| `/dashboard/admin` (Control Tower) | Mix of campaigns, agents, integrations | Tiles show counts; timeline lists upcoming campaigns; CTA cards link to submodules + `/backend` scripts. Include “Engine vs Storefront” status panel. |
| `/dashboard/admin/campaigns` | `prisma.campaign`, `campaignExecution`, deliverability stats | Table must support search, filters, Launch/Pause/Duplicate/Delete actions, inline editing of schedule windows, and CTA linking to CLI instructions. Show deliverability %, last blast summary, and associated ingestion file. |
| `/dashboard/admin/agents` | `prisma.agent` (role, status, skills, leads assigned) | Provide Message/Call/Assign lead buttons, availability toggles, skill tags, and workload indicators. Assignment modal should update `lead.assignedAgentId` and log audit entry. |
| `/dashboard/admin/automations` | `automationConfig`, `automationRun` tables | Show cron string, last run status/duration, next run time. Actions: Run now, Pause, Resume, View Logs (link to run log table), Edit schedule. Highlight warnings when last run failed. |
| `/dashboard/admin/integrations` | `integration` records (EzTexting, Twilio, Webhook relays) | Cards display connection state, last event, credentials status, and CTAs: Test webhook, Reconnect, View logs, Configure. Twilio stays stub until credentials exist; once connected, show phone numbers/webhook URLs. |
| `/dashboard/admin/reports` (or `/dashboard/reports`) | `ingestionJob`, `interaction`, `campaignExecution` | Table lists CSV jobs (file, rows, duration, startedBy, status). Stats include SMS sent, responses, conversions, appointments. Add charts for daily volume + response rate. |
| `/dashboard/admin/logs` (future) | `webhookLog`, `automationRun`, `campaignEvent` | Provide filters, keyword search, export CSV, and quick links to retry failed events. |

**Navigation**
- Top nav (minimal) with primary sections only: Dashboard, Queue, Admin, Reports + account avatar (profile/settings/logout).
- Secondary nav uses pill-style layout (side rail or footer) for sub-sections (Admin › Campaigns/Agents/Automations/Integrations/etc).
- Each page renders a module pill footer summarizing dataset + refresh time (e.g., `Data · Campaigns via Neon · refreshed 09:31 UTC`).
- Add breadcrumb text (“Admin › Campaigns”) and CTA pill linking to `/backend` when manual action required.

**Auth**
- Admin routes require `role === 'admin'` (or similar). Middleware should check before rendering.
- Add account dropdown with “Profile, Switch role, Logout”.

**Telemetry + Logs**
- Admin views should expose webhook log stream (table) and ingestion job timeline so ops can debug without SSH.
- Automations screens should show health badges (ok/warning/failing) derived from latest run results and link to raw logs.
- Integrations page should highlight downtime incidents (Twilio/EzTexting auth errors) with remediation CTAs.

### 8.3 Combined Data Model Mapping
| UI Element | Prisma Model(s) | Engine Touchpoints |
| --- | --- | --- |
| Lead cards/table | `lead`, `contact`, `property`, `interaction` | Engine ingestion populates leads/contacts/properties. |
| Campaign table | `campaign`, `campaignMessage`, `campaignExecution` | Engine CLI triggers ingestion/blasts referencing Campaign IDs. |
| Agent presence | `agent` (maybe same as `user`) | Agents managed via admin UI; presence updates stored via heartbeats. |
| Automations | `automationConfig`, `automationRun` | Could be managed by `/backend` scripts; UI just toggles flags. |
| Integrations | `integration` table (type, status, lastEvent) | Webhooks update status; CLI can patch records when credentials change. |
| Reports | `ingestionJob`, `interaction` stats | Engine writes ingestion job rows; Storefront reads/visualizes. |

**Implementation Notes**
- Use React Query for client fetches; keep server actions for mutations.
- Revalidate queries on mutation; fallback to `revalidatePath` for server-side routes.
- Provide skeleton states for every table/card so UI remains responsive while data loads.

### 8.4 Environment & Deployment Considerations
- `/backend` stays local; continue to run CLI scripts for ingestion/blasts.
- `/frontend` deploys on Vercel; ensure env variables (Neon pooled, Twilio, EzTexting, etc.) are set there.
- Neon remains the shared DB; treat it as the canonical dataset.
- Document any required Vercel cron jobs or background functions once telemetry is live.

The goal: a cutting-edge CRM-style experience that is data-accurate, role-aware, and clearly shows which subsystem (Engine vs Storefront) controls each feature. Use this plan alongside the UI/UX doc to guide implementation.
