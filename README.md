/*
 * PROPRIETARY AND CONFIDENTIAL
 * 
 * Copyright © 2025 Always Improving LLC. All Rights Reserved.
 * 
 * This software is the property of Always Improving LLC and is protected
 * under applicable intellectual property laws. Unauthorized copying,
 * modification, distribution, or use is strictly prohibited.
 * 
 * Access to this code is provided under the terms of the Shareholders'
 * Agreement of Monthaven Capital Inc., §8.3. No license is granted.
 */
# Monthaven Acquisition Engine (MAE)

**Status:** ACTIVE | **Version:** 3.0.0 (Hybrid Architecture)

## 1. Executive Summary
The Monthaven Acquisition Engine (MAE) keeps heavy acquisition work off of serverless platforms. The Engine (everything under `/backend`) runs locally with `ts-node` so you can ingest massive DealMachine CSVs, normalize legacy JSON bundles, and launch EzTexting blasts without Lambda timeouts. The Storefront (the `/frontend` Next.js 14 app) lives on Vercel so agents can triage replies, assign leads, and monitor telemetry around the clock. Both halves share a Neon Postgres instance through Prisma clients, React Query hooks, and a Tailwind based UI kit.

## 2. Implementation Snapshot & Doc Map

MAE v3 ships as two codebases that share one schema:

- [`/backend/README.md`](backend/README.md) is the operator playbook for the CLI engine, Prisma migrations, and the standard database workflow.
- [`/frontend/README.md`](frontend/README.md) covers the Storefront stack, component system, and how dashboard views are composed.
- [`frontend/docs/ui-ux-plan.md`](frontend/docs/ui-ux-plan.md) contains the detailed polishing plan for dashboard, queue, admin, and telemetry modules.

The table below captures what is already implemented and what is still pending so this README stays aligned with the repo:

| Surface | What is live today | Gaps / next steps |
| --- | --- | --- |
| Engine scripts | `backend/src/scripts/{ingest,import-staged,create-campaign,blast}.ts` stream CSVs/JSON, upsert `Contact`, `Property`, `Lead`, tag DNC entries, log telemetry, and trigger EzTexting via `CampaignService`. | Twilio send paths are not implemented yet, so outbound SMS still relies on EzTexting. Make sure `backend/.env` has valid EzTexting credentials before launching a blast. |
| Schema and Prisma clients | `scripts/db-sync.cjs` copies `backend/prisma/schema.prisma` into `frontend/prisma/schema.prisma`, then runs `npx prisma generate` inside both packages. | Keep the backend schema identical to the frontend copy (models: `User`, `Contact`, `Property`, `Campaign`, `Lead`, `LeadAudit`, `Interaction`, `IngestionJob`, `WebhookLog`, `DncList`). Update the backend file before running `npm run db:sync` to avoid copying an outdated definition. |
| Storefront data plumbing | Next.js API routes (`/api/leads`, `/api/agents`, `/api/campaigns`, `/api/automations`, `/api/integrations`, `/api/telemetry/*`, `/api/webhooks/eztexting`) already talk to Prisma, and server actions (`getLeadDetails`, `sendReplyAction`, `updateLeadStatus`, `assignLeadAction`, `logCallOutcomeAction`) mutate Neon. Chat threads, inbox, queue filters, campaigns, automations, integrations, and telemetry hooks are wired to live data. | Remaining placeholders: `/dashboard/reports` is a stub and `/dashboard/intelligence` charts are static. Wire those to telemetry once rows exist. |
| Auth and session | `app/actions.ts` ships `loginAction`/`logoutAction` that set the `mae_user` and `mae_role` cookies, and `lib/auth.ts` plus lead actions look up the Prisma `user` table. `middleware.ts` redirects unauthenticated users and blocks `/dashboard/admin/*` for non-admin roles. | Harden the login UX as needed; hydrate `TopBar`/`Sidebar` from `getCurrentUser()` if you want SSR user display. |
| Twilio integration | `/api/integrations/twilio` uses `lib/integrations.ts` to inspect `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, and `NEXT_PUBLIC_SITE_URL` and reports status back to the Integrations screen. Twilio creds (office line for text/call) belong in the env files; inbound webhook lives at `/api/webhooks/twilio`. | Outbound Twilio SMS/call paths are not wired yet. Mirror EzTexting’s send path in the Engine to use the office line once ready. |
| Telemetry and reports | `/api/telemetry/ingestion` and `/api/telemetry/webhooks` query `IngestionJob` and `WebhookLog`, and `frontend/lib/hooks/useTelemetry.ts` polls those endpoints so admin widgets can render real job/log data when Neon tables exist. | `/dashboard/reports` is currently a placeholder and `/dashboard/intelligence` uses static Recharts data. Bind those pages to the telemetry hooks once Neon has rows and bubble up failures inside the admin modules. |

## 3. System Architecture

### A. The Brain (Database)
- **Technology:** Neon (serverless Postgres).
- **Role:** Shared source of truth. The Engine connects through a direct connection string, while the Storefront uses the pooled connection with PgBouncer enabled.
- **Models:** `User`, `Contact`, `Property`, `Campaign`, `Lead`, `LeadAudit`, `Interaction`, `IngestionJob`, `WebhookLog`, `DncList`, plus any future tables you add through backend migrations.

### B. The Engine (Local Backend)
- **Location:** `/backend`
- **Runtime:** Node 18+ with `ts-node`.
- **Highlights:** `ImportService` streams DealMachine CSVs, `import-staged.ts` hydrates the normalized JSON bundles, `campaignService.ts` handles EzTexting groups and blasts, and helper scripts create campaigns, queue blasts, and backfill DNC entries. Everything talks to Prisma through `backend/prisma/schema.prisma`.

### C. The Storefront (Cloud Frontend)
- **Location:** `/frontend`
- **Runtime:** Next.js 14 App Router (deployed on Vercel).
- **Highlights:** React Query hooks (`frontend/lib/hooks`), server actions in `app/actions.ts`, API routes under `app/api`, Tailwind based components under `components`, EzTexting webhook handler at `/api/webhooks/eztexting`, and integrations telemetry driven by Prisma. Pages such as `/dashboard/chat/[id]` already call Prisma for real data, while `/dashboard`, `/dashboard/queue`, `/dashboard/campaigns`, and `/dashboard/admin/*` currently show mocked collections until they are wired to `lib/api.ts`.

## 4. Repository Layout

```text
/
  backend/                # Engine scripts, Prisma schema, EzTexting client
    prisma/
    src/
  frontend/               # Storefront Next.js app
    app/
    components/
    lib/
    prisma/
  scripts/
    db-sync.cjs           # Copies backend schema -> frontend and runs prisma generate in both packages
  data/                   # Sample CSVs or staging files
  google-services/        # Ancillary Google Apps Script assets
  README.md               # This document
```

## 5. Setup Guide

### Phase 1: Database (Neon)
1. Create a Neon project.
2. Provision two connection strings:
   - Direct connection (used by the Engine for migrations and long running scripts).
   - Pooled connection with `pgbouncer=true` (used by Vercel and local Storefront dev).

### Phase 2: Environment Variables

`backend/.env`

```text
DATABASE_URL="postgres://<user>:<pass>@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
EZTEXTING_USER="..."
EZTEXTING_PASS="..."
# optional: EZTEXTING_API_KEY if you use tokens instead of user/pass
```

`frontend/.env` (mirror these in Vercel)

```text
# MUST point at the pooled Neon connection
DATABASE_URL="postgres://<user>:<pass>@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
# Prisma still needs the direct URL for migrations/generate
DIRECT_URL="postgres://<user>:<pass>@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_SITE_URL="https://your-project.vercel.app"
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_FROM_NUMBER=""
```

### Phase 3: Install Dependencies and Sync Schema

```powershell
# Install root tools (axios, dotenv, etc.)
npm install

# Install package dependencies
cd backend && npm install
cd ../frontend && npm install

# Copy backend schema -> frontend and regenerate both Prisma clients
cd ..
npm run db:sync
```

`npm run db:sync` copies `backend/prisma/schema.prisma` into `frontend/prisma/schema.prisma`, then runs `npx prisma generate` in `/frontend` and `/backend` so both sides stay in lockstep.

> Tip: `npm run setup` runs the same install sequence if you prefer a single command.

## 6. Operations Playbook

### Workflow A: Stream a DealMachine CSV
Process a CSV locally so files hundreds of MB wide finish without serverless limits.

```powershell
# from repo root
npm run engine:ingest -- "../data/leads_nov_2025.csv" CAMP_NOV_A
# or:
cd backend
npx ts-node src/scripts/ingest.ts "../data/leads_nov_2025.csv" "CAMP_NOV_A"
```

The script:
- Streams the CSV through `csv-parser`.
- Normalizes up to 20 contact slots per property via `normalizePhone`.
- Upserts `Property` and `Contact` rows.
- Creates `Lead` entries per campaign (`NEW` for mobile, `QUEUED_FOR_CALL` for landline).
- Updates optional `IngestionJob` records when you pass an `ingestionJobId`.

### Workflow B: Import staged JSON/CSV bundles
Use the normalized exports that live under `/parsed-extraction` (contacts JSON, interactions JSON, DNC CSV).

```powershell
cd backend
npm run script:import-staged -- ^
  --contacts ..\parsed-extraction\commercial_contacts.json ^
  --interactions ..\parsed-extraction\interactions_consolidated.json ^
  --dnc ..\parsed-extraction\dnc_full.csv ^
  --campaign "Legacy Multifamily 2024"
```

This script upserts contacts and properties, links leads to campaigns, hydrates interaction history, and keeps the `DncList` table synchronized.

### Workflow C: Create a campaign shell
When you need a campaign id before ingestion:

```powershell
cd backend
npm run script:create-campaign
```

### Workflow D: Launch an EzTexting blast
Trigger a batch SMS against all `NEW` leads:

```powershell
npm run engine:blast
# prompts for campaign name and message, then requires typing LAUNCH
```

`CampaignService` handles group creation, contact uploads, and sets lead status to `SENT` once EzTexting confirms the blast.

### Workflow E: Catch inbound replies
EzTexting should post to `https://<vercel-app>/api/webhooks/eztexting`. The handler:

1. Normalizes the phone number and deduplicates payloads.
2. Finds the `Contact` (and latest lead) by phone.
3. Inserts an `Interaction` row and updates the lead status (RESP_HOT, RESP_WARM, RESP_STOP, etc).
4. Logs the webhook payload into `WebhookLog`.

### Workflow F: Schema sync sanity check
Any time you modify `backend/prisma/schema.prisma`:

```powershell
npm run db:sync
cd backend && npx prisma migrate dev --name <change>   # run locally against Neon
cd frontend && npx prisma generate                     # optional extra guarantee
```

Do not edit `frontend/prisma/schema.prisma` by hand; it will be overwritten by `db:sync`.

## 7. Development Guidelines

1. **Schema ownership:** Treat `backend/prisma/schema.prisma` as the master file. The frontend copy is generated.
2. **Migrations:** Run `cd backend && npx prisma migrate dev --name <change>` against your Neon database (or a local shadow db), commit the resulting `prisma/migrations/**`, then run `npm run db:sync`.
3. **Prisma clients:** Run `npx prisma generate` inside both `/backend` and `/frontend` after schema changes so server actions and CLI scripts compile.
4. **Local Storefront dev:** Use `npm run dev:frontend` to start the Next.js watcher. Set `DATABASE_URL`/`DIRECT_URL` in `frontend/.env` so Prisma can connect, and set `NEXT_PUBLIC_SITE_URL` so integrations cards show the correct webhook URL.
5. **Testing:** `npm run engine:test` executes the backend Jest suite. Frontend tests are not wired yet; rely on Storybook ready components or add Playwright later.
6. **Encoding:** Keep files ASCII only (this README already follows that rule). Remove smart quotes or special characters when editing UI copy.

## 8. Storefront State and Roadmap

### 8.1 Data plumbing (React Query + Prisma)

| Area | Current implementation | Next step |
| --- | --- | --- |
| Leads, inbox, queue | `/api/leads` hits Prisma and `lib/api.ts` exposes `fetchLeads`, but `useLeads.ts` still returns the mock array so `/dashboard`, `/dashboard/queue`, and KPI tiles display placeholder data. Chat threads already call `getLeadDetails` for real data. | Point `useLeads` at `fetchLeads`, add status filters (`?status=RESP_HOT,...`), and hydrate dashboard widgets plus queue cards with the live response. |
| Agent presence and assignment | `/api/agents` selects `User` records plus assigned lead counts, `useAgents` polls it every 15s, and `AssignmentModal` plus `LeadActionButtons` consume that hook. | Add heartbeat fields (`lastHeartbeat`, SLA timers) once the database stores that data, and render those states in the sidebar/top bar. |
| Campaigns view | `/api/campaigns` queries Prisma, `lib/api.ts` has `fetchCampaigns`, and React Query hooks are ready. `app/dashboard/campaigns/page.tsx` still imports `MOCK_CAMPAIGNS`. | Swap the page over to `useCampaigns` and include `_count.leads`, last activity, and CTA links that jump into CLI instructions. |
| Automations view | `/api/automations` mixes `IngestionJob` and `WebhookLog` delegates when tables exist, but the UI renders `MOCK_AUTOMATIONS`. | Replace the mock table with `useAutomations` and show actual job/webhook latency plus a link back to Engine scripts. |
| Integrations view | `/api/integrations/twilio` and `lib/integrationStatus` already report Twilio/EzTexting status based on env vars. | Add EzTexting health, webhook log counts, and CTAs (Test webhook, Reconnect) based on Prisma telemetry. |
| Telemetry widgets | `/api/telemetry/ingestion` and `/api/telemetry/webhooks` exist along with `useTelemetry.ts`. | Pipe those hooks into `/dashboard/intelligence`, admin cards, and the Integrations page once `IngestionJob`/`WebhookLog` rows exist. |
| Reports/Intelligence | `/dashboard/reports` currently redirects to other modules and `/dashboard/intelligence` shows static chart data. | Bind Intelligence to the telemetry hooks above and design a true Reports page that aggregates `LeadAudit`, `Campaign`, and `IngestionJob` rows. |

### 8.2 Authentication and session enforcement
- `loginAction` / `logoutAction` (in `app/actions.ts`) look up `User` rows by email and set the `mae_user` and `mae_role` cookies via `cookies()`.
- `lib/auth.ts` exposes `getCurrentUser()` so server actions (assignment, SLA logging, etc) can stamp `LeadAudit` rows with a user id.
- `frontend/middleware.ts` reads `mae_user` and `mae_role`; it redirects unauthenticated users away from `/dashboard` and blocks `/dashboard/admin/*` unless `mae_role=ADMIN`.
- **Next steps:** Wire `TopBar` / `Sidebar` to display the logged-in user/role (server-side) and tighten the login form UX/validation.

### 8.3 Twilio integration
- The Integrations page calls `/api/integrations/twilio`, which in turn uses `lib/integrations.ts` to assess env vars, compute the webhook URL, and show guidance.
- No Twilio webhook route or outbound action exists yet.
- **Next steps:** Store Twilio credentials in both env files, add `/api/webhooks/twilio`, mirror the EzTexting webhook logic (normalize phone, update lead, insert interaction, log webhook), and expose a Twilio send path in the Engine once numbers are available.

### 8.4 Telemetry and ops signals
- Telemetry API routes read `IngestionJob` and `WebhookLog`.
- `frontend/lib/hooks/useTelemetry.ts` already polls both endpoints so admin widgets can subscribe via React Query.
- `/dashboard/intelligence`, admin cards, and integrations UI are still hard coded.
- **Next steps:** Feed the telemetry hooks into those UIs, add failure/success badges, and keep `/dashboard/reports` as the long running log view once the data is live.

### 8.5 Navigation and layout polish
- `components/Sidebar` and `components/TopBar` deliver the current navigation shell; Sidebar now hides admin routes for non-admins and middleware enforces those routes. Breadcrumbs, nav pills, and account dropdowns are still static.
- Align the nav labels with the modules listed in `frontend/docs/ui-ux-plan.md`, add breadcrumb text (`Admin > Campaigns`), and use the Page Footer pill to link back to Engine actions where needed.

### 8.6 Recharts build warning
- Static generation emits a harmless Recharts size warning for the small sparkline containers. To silence it, add a `minHeight`/`minWidth` to chart wrappers or lazy-load sparklines on the client only.

## 9. Data Flow Blueprint

Use this section as the contract between Prisma models, Engine scripts, and Storefront components.

### 9.1 `/dashboard` (Command Center)
**Audience:** Closers, callers, SMS agents.

| Surface | Data source | Notes |
| --- | --- | --- |
| KPI tiles | `getDashboardStats()` server action aggregates `Lead` and `Interaction` records; `useDashboardStats` currently mixes those stats with `useLeads`. | Replace the mock lead slice with `fetchLeads` so totals, Hot counts, and trend arrows reflect Neon data. |
| Inbox radar / hot threads | Intended to read `/api/leads?status=RESP_HOT,RESP_WARM,CONVERSATION_ACTIVE,SENT`. | The hook still uses mocks; wire it to `fetchLeads` with filters and add campaign filters plus SLA badges. |
| Call queue | Targeting `/api/leads?status=QUEUED_FOR_CALL`. | Same as above: filter server data, include phone type, and enable call CTAs that invoke `logCallOutcomeAction`. |
| Chat threads (`/dashboard/chat/[id]`) | `getLeadDetails` + `sendReplyAction` + `LeadActionButtons` (all call Prisma). | Already live: displays `Lead`, `Contact`, `Property`, `Interaction` data and writes `LeadAudit` rows when statuses change. |
| Assignment modal | `useAgents` -> `/api/agents` (selects `User` with assigned lead counts). | Live today; add SLA timers and assignment audit entries as described in `app/actions.ts`. |
| Notifications/toasts | UI scaffolding exists but is not yet wired to React Query mutation states. | Hook `LeadActionButtons` and assignment transitions up to a toast provider once we start surfacing success/failure banners. |
| Pill footer | `components/PageFooterRail` renders static copy today. | Update the pill to show dataset name (`Neon -> RESP_HOT (24) -> refreshed 09:31 UTC`) once live data flows. |

**User journey**
1. Middleware verifies the session cookie and loads `/dashboard`.
2. React Query fetches leads, agents, and telemetry in parallel (placeholder data until hooks are wired).
3. Accept/Snooze/Assign buttons call server actions which update `Lead`, `LeadAudit`, and `Interaction`, then `revalidatePath('/dashboard')`.
4. Chat replies call `sendReplyAction`, insert an `Interaction`, set `status = CONVERSATION_ACTIVE`, and revalidate dashboard plus the thread route.
5. Queue interactions eventually log call outcomes through `logCallOutcomeAction`.

### 9.2 `/dashboard/admin/*` (Operations suite)
| Route | Prisma models | Capabilities / Plan |
| --- | --- | --- |
| `/dashboard/admin` | `Campaign`, `User`, `Integration`, telemetry hooks | Shows launch cards plus status tiles. Wire the cards to live data and include CTAs back to Engine scripts. |
| `/dashboard/admin/campaigns` | `Campaign`, `_count.leads`, recent `Lead` updates | Replace `MOCK_CAMPAIGNS` with `useCampaigns`, show deliverability stats, and add buttons that reference CLI commands (ingest, blast). |
| `/dashboard/admin/agents` | `User`, `Lead` assignments, `LeadAudit` | Already renders real agents via `useAgents`. Next step: display workloads, skill tags, and audit trails when assignments happen. |
| `/dashboard/admin/automations` | `IngestionJob`, `WebhookLog` (via `/api/automations`) | Replace the mock table with `useAutomations` and show latest job runs plus webhook health. |
| `/dashboard/admin/integrations` | Twilio/EzTexting status + telemetry hooks | Use `useIntegrations` once it is wired, surface last webhook timestamps, and expose reconnect/test actions. |
| `/dashboard/intelligence` | Telemetry hooks (`useIngestionJobs`, `useWebhookLogs`) | Replace static chart arrays with real data and highlight failures. |
| `/dashboard/reports` | `IngestionJob`, `LeadAudit`, `WebhookLog` | Currently a placeholder redirect. Rebuild it once telemetry rows are flowing from Engine scripts. |

### 9.3 Combined data model mapping
| UI element | Prisma models | Engine touchpoints |
| --- | --- | --- |
| Lead cards, queue rows, chat header | `Lead`, `Contact`, `Property`, `LeadAudit` | `import-staged.ts` and `ingest.ts` populate these tables; `LeadActionButtons` and `assignLeadAction` mutate them. |
| Interaction timeline | `Interaction`, `WebhookLog` | EzTexting webhook + Engine import append to `Interaction`; inbound webhooks also log into `WebhookLog`. |
| Campaign table | `Campaign`, `Lead`, `_count.leads`, `IngestionJob` | `create-campaign.ts`, `ingest.ts`, and `campaignService.ts` maintain these rows. |
| Agent presence | `User`, `Lead` (assigned), future heartbeat table | `AssignmentModal` connects leads to users; Engine scripts can seed users and presence metadata. |
| Telemetry widgets | `IngestionJob`, `WebhookLog`, `LeadAudit` | Engine ingestion scripts update `IngestionJob` (status, counts) and webhook handlers insert `WebhookLog`. |
| DNC tooling | `DncList`, `Lead` | `import-staged.ts` adds DNC entries and ingestion scripts set `Lead.status = RESP_STOP`. |

### 9.4 Environment and deployment considerations
- `/backend` always runs on a developer workstation (or a beefy EC2 instance) so ingestion and blasting are not subject to Vercel time limits.
- `/frontend` deploys on Vercel; make sure the pooled Neon URL plus requisite Twilio/EzTexting env vars are set there.
- Neon remains the canonical database. Run migrations locally, backup before massive imports, and keep Metabase (or any BI tool) pointed at the same schema.
- Cron style observability (heartbeat checks, webhook retries) should be implemented via Vercel cron jobs or a lightweight scheduler once telemetry wiring is done.

---

Use this README together with `backend/README.md`, `frontend/README.md`, and `frontend/docs/ui-ux-plan.md` when onboarding. The docs collectively describe the hybrid architecture, the operational workflows, and the outstanding work required to finish the Storefront polish.
