# MAE Command Center (Frontend)

The visual interface for the Monthaven Acquisition Engine (MAE).

## 1. Setup & Install
```powershell
# From `frontend/`
npm install
npx prisma generate
```

## 2. Local Development
```powershell
# Start Next.js dev server (Next 15.x)
npm run dev
# Runs on http://localhost:3000
```

The app connects to the database defined in `frontend/.env` (`DATABASE_URL` pooled Neon, `DIRECT_URL` direct Neon).

## 3. Deployment (Vercel)
1. Import the repo; set Root Directory to `frontend` if prompted.
2. Environment variables:
   - `DATABASE_URL` — pooled Neon URL (e.g. `...-pooler...&pgbouncer=true`)
   - `DIRECT_URL` — direct Neon URL (Prisma needs this for generate/migrate)
   - `NEXT_PUBLIC_SITE_URL` — your deployed URL
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — Twilio office-line creds (text/call) used for health checks and future outbound wiring
3. Build/install: defaults are fine (`npm install`, `next build`).
4. Important: run `npm run db:sync` from repo root after schema changes so `frontend/prisma/schema.prisma` stays in sync.

## 4. Data Plumbing & Hooks (live)
- API routes (`/api/leads`, `/api/agents`, `/api/campaigns`, `/api/automations`, `/api/integrations`, `/api/telemetry/*`, `/api/webhooks/eztexting`) hit Prisma/Neon.
- React Query hooks (`useLeads`, `useAgents`, `useCampaigns`, `useAutomations`, `useIntegrations`, `useTelemetry`) power `/dashboard`, `/queue`, `/inbox`, `/campaigns`, `/admin/*`, `/intelligence`.
- Live: chat threads, inbox, queue filters, campaigns, automations, integrations, telemetry cards. Remaining: `/dashboard/reports` is a stub; `/dashboard/intelligence` charts are static until telemetry rows exist.
- Pattern: add an API route → `lib/api.ts` fetch helper → `useX` hook → page.

## 5. Auth & Roles
- `loginAction` / `logoutAction` set `mae_user` and `mae_role`; `lib/auth.getCurrentUser` reads Prisma users.
- `middleware.ts` redirects unauthenticated users from `/dashboard*` and blocks `/dashboard/admin/*` unless `mae_role=ADMIN`.
- Sidebar hides admin links for agents; profile link sends admins to `/dashboard/admin/agents`, agents to `/dashboard`.

## 6. UX & Navigation
- Design language (dark command-center, glass panels) lives in `app/globals.css` + Tailwind.
- Navigation: Sidebar + TopBar; breadcrumbs/account dropdowns remain light. Keep footer/breadcrumbs in sync when adding routes.
- Known warning: Recharts emits a size warning during SSG for small sparklines—harmless; add `minHeight/minWidth` if you want silence.

For detailed polish tasks see [`docs/ui-ux-plan.md`](docs/ui-ux-plan.md). Coordinate schema/API changes with `/backend/README.md` and the root README.
