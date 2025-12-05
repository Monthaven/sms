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
# Start Next.js dev server
npm run dev
# Runs on http://localhost:3000
```

The app connects to the database defined in `frontend/.env`.

## 3. Deployment (Vercel)
This project is optimized for Vercel.

1. Push the `frontend/` folder (or monorepo root) to GitHub.
2. Import the project in Vercel.
   - If prompted, set the Root Directory to `frontend`.
3. Environment Variables in Vercel:
   - `DATABASE_URL` — MUST use the Neon Pooled URL (e.g. `...-pooler.us-east-2...&pgbouncer=true`).
   - `NEXT_PUBLIC_API_URL` — Optional, if you have external APIs.
4. Build & Install commands: use Vercel defaults (`npm install`, `next build`).

Important: Run `npm run db:sync` from the repo root locally after any schema changes so `frontend/prisma/schema.prisma` is up to date before deploying.

## 4. Data Plumbing & Hooks
- `/app/api/leads`, `/api/agents`, `/api/campaigns`, `/api/automations`, and `/api/integrations` are Prisma-backed and return live Neon data.
- React Query hooks (`useLeads`, `useAgents`, `useCampaigns`, `useAutomations`, `useIntegrations`, `useTelemetry`, `useTwilioStatus`) power pages so the UI updates automatically as ingestion scripts run.
- Admin pages are client components that render loading/error states based on these hooks; no mock data remains in the Storefront.
- When adding a new dashboard module, expose a typed API route first, export a `fetchX` helper from `lib/api.ts`, then wrap it in a `useX` hook for consistency.

## 5. UX & Navigation Plan
- The design language (dark “command center” palette, glass panels, footer pill) is defined in `app/globals.css`. Components should either reuse those classes or consume Tailwind utilities that reference the `mae` color tokens.
- Navigation is a two-layer system: primary nav (Command ▸ Queue ▸ Admin ▸ Reports) in `TopBar`/`BottomNav`, and contextual pill nav derived from `lib/navigation.ts`. Keep breadcrumbs and footer pill metadata in sync with any new route.
- Upcoming work (mirrors the root README roadmap):
  1. **Data plumbing:** ensure `/api/{leads,campaigns,agents,automations,integrations}` proxy Neon via Prisma—no mocks in production.
  2. **Auth & role gating:** middleware must redirect anonymous users; admin routes require `User.role === ADMIN`.
  3. **Twilio integration:** once credentials exist, wire `/api/webhooks/twilio`, outbound messaging actions, and Integrations UI health states.
  4. **Telemetry:** Reports page should display live ingestion jobs and webhook logs; NotificationsPanel pulls from `/api/telemetry/*`.
  5. **Navigation polish:** top bar + bottom pill must follow the “cutting-edge CRM” spec (breadcrumbs, CTA pills, notifications rail).

For detailed mockups/tasks see [`docs/ui-ux-plan.md`](docs/ui-ux-plan.md). Coordinate any schema or API changes with `/backend/README.md` and the root README “Storefront Upgrade Roadmap.”
