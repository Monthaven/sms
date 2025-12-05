# Monthaven Command Center · UX & Product Plan

This plan translates the monorepo/README vision into a fully realized Storefront experience. It maps flows, routes, shared components, and integration touchpoints (present + future) so implementation can happen iteratively without rethinking structure.

## 1. Experience Pillars
- **Hybrid Visibility:** Surface Engine (local) + Storefront (cloud) status everywhere.
- **Agent Velocity:** Inbox, Call Queue, and Chat flows minimize clicks; CTA buttons are always visible.
- **Operational Control:** Admin area manages campaigns, automations, agents, and integrations (EzTexting/Twilio).
- **Audit & Resilience:** Every route has empty/loading/error states, and `/not-found` is branded with recovery CTAs.
- **Future-Ready Integrations:** Twilio + other channels stubbed as settings + API endpoints with status indicators.

## 2. Route Map
| Route | Purpose | Key Components |
| --- | --- | --- |
| `/` | Launchpad/login hero | Marketing hero, architecture highlights, login form |
| `/dashboard` | Command overview + Inbox radar + conversation table | KPI cards, agent presence, status badges, table with CTA |
| `/dashboard/queue` | Phone-ready leads | Hero metrics, dialer list, batch actions |
| `/dashboard/chat/[id]` | Conversation timeline | Lead profile header, interactions list, reply composer, status controls |
| `/dashboard/admin` | Admin home (“Control Tower”) | Grid of sub-panels with counts + quick actions |
| `/dashboard/admin/campaigns` | Manage SMS campaigns | Advanced table, filters, create modal stub |
| `/dashboard/admin/agents` | Manage team + presence | Roster grid, availability toggles, invite modal stub |
| `/dashboard/admin/automations` | Engine schedules + webhook monitors | Timeline, toggle cards, cron display |
| `/dashboard/admin/integrations` | Channel health (EzTexting, Twilio, Webhooks) | Status cards, connect buttons, log stream |
| `/dashboard/reports` (optional) | Trend charts + ingestion stats | Sparkline cards, ingestion queue table |
| `/not-found` | 404 with CTA buttons | Explanation, Accept buttons (“Return to Command Center”, “Launch Engine guide”) |

## 3. Shared Components (Client)
- **Shell**
  - `Sidebar`: nav + status cards; highlights admin subsections.
  - `TopBar`: date filter, breadcrumbs, account CTA, and pill sub-navigation.
- **UI Primitives**
  - `MetricCard`, `StatusBadge`, `HeatBadge`, `AgentPill`, `Tag`.
  - `GlassPanel`, `PanelHeader` for consistent styling.
  - `CTAButton` variations (primary, ghost, destructive).
- **Tables**
  - `DataTable` abstraction with column config, sorting + optional row actions stub.
  - Empty + loading placeholders (skeleton shimmer).
- **Modals/Drawers**
  - `CommandDrawer`: for quick actions (assign agent, update status).
  - `IntegrationModal`: connect/disconnect Twilio.
- **Rails & Footers**
  - `PageFooterRail`: CTA pill footer on every major view to keep Accept buttons accessible.
- **Charts (stub)**
  - `Sparkline` (pure CSS), `BarBadge` for statuses.

## 4. Data & State Strategy
- **Server Actions:** continue to use Prisma-backed actions for login, sendReply, etc.
- **Client Fetching:** Keep `fetchLeads` placeholder but extend `lib/api.ts` with:
  - `fetchCampaigns`, `fetchAgents`, `fetchAutomations`, `fetchIntegrations`.
  - Use mock data for now (auto-synced to `lib/mocks.ts`).
- **Presence & Multi-Agent**
  - `AgentPresenceBar` component showing logged-in teammates.
  - Accept/Decline buttons for claimable leads.
- **CTA (“Accepting buttons”)**
  - For each lead row, show `Accept Lead` + `Reassign` options.
  - For campaigns, `Launch`, `Pause`, `Duplicate` buttons.

## 5. Twilio Integration Stubs
- **Settings Card:** `IntegrationsCard` with `Twilio` + `EzTexting`.
- **API Placeholder:** `/app/api/integrations/twilio/route.ts` returning `{ status: "disconnected" }`.
- **Env Guidance:** highlight expected vars (TWILIO_ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER) in UI + doc hints.
- **Action Buttons:** `Connect Twilio` (opens modal), `Test Webhook`, `View Logs`.

## 6. Flows
1. **Login → Dashboard**
   - After login, show KPI hero + quick CTA to start Engaging or Launch Engine CLI.
2. **Inbox Accept**
   - Lead row contains Accept + Snooze, with multi-agent assignment (uses `AgentPresence` to show who took it).
3. **Call Queue**
   - Batch select, `Mark Contacted`, `Skip`.
4. **Chat Compose**
   - Reply composer + macros (stub).
5. **Admin Campaign Create**
   - “Create Campaign” CTA opens modal stub (fields: Name, Target Status, Message Template, Channel).
6. **Integrations**
   - Connect/Disconnect Twilio or EzTexting; show last webhook, request log.
7. **404 Recovery**
   - Provide Accept buttons: `Return to Dashboard`, `Open Admin`, `Docs`.

## 7. Implementation Phases
1. **Core Shell & Styling** (already underway) – extend to include TopBar + agent presence.
2. **Dashboard Enhancements** – add Accept buttons, multi-agent view, ingestion stats.
3. **Admin Suite** – new routes + components (Campaigns, Agents, Automations, Integrations).
4. **Support Pages** – `/dashboard/reports`, `/not-found`.
5. **API/Mock Layer** – `lib/mocks.ts`, integrate Twilio stub route.
6. **QA** – lint + (future) e2e harness.

This plan should remain living documentation—update as new schema fields arrive from the Engine.***
