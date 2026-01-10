/*
 * PROPRIETARY AND CONFIDENTIAL
 *
 * Copyright (c) 2025 Always Improving LLC. All Rights Reserved.
 *
 * This software is the property of Always Improving LLC and is protected
 * under applicable intellectual property laws. Unauthorized copying,
 * modification, distribution, or use is strictly prohibited.
 *
 * Access to this code is provided under the terms of the Shareholders'
 * Agreement of Monthaven Capital Inc., section 8.3. No license is granted.
 */

# MAE Command Center (Frontend)

Production Next.js App Router UI for the Monthaven Acquisition Engine (MAE): lead inbox, SMS/voice console, campaign controls, and admin tooling. Stack highlights: Next.js 15.5.7, React 19, Tailwind 3.3, Prisma 5.22, React Query 5, Twilio Voice SDK 2.17.

## Quick start
1) Node 18+ (Node 24 verified). From `frontend/`, copy `.env.example` to `.env.local` and fill secrets.  
2) Install deps: `npm install`  
3) Generate Prisma client: `npx prisma generate`  
4) Run dev server: `npm run dev` (http://localhost:3000)  
If schema changes land in `backend`, run root `npm run db:sync` first to sync `prisma/schema.prisma`.

## Scripts
- `npm run dev` — Build Tailwind, start Next dev server.
- `npm run build` — prisma:generate → css:build → Next production build.
- `npm run prisma:generate` — Generate Prisma client from `prisma/schema.prisma`.
- `npm run css:build` — Tailwind → `app/generated.css` (imported by `layout.tsx`).
- `npm run lint` — ESLint via Next.
- `npm start` — Serve production build (`next start`).

## Environment (essentials)
- Database: `DATABASE_URL` (pooled/pgbouncer recommended; Neon).  
- Twilio voice/SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `TWILIO_TWIML_APP_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_WEBHOOK_URL`, `VALIDATE_TWILIO_SIGNATURE`.  
- EzTexting: `EZTEXTING_USER`, `EZTEXTING_PASS`, `DEFAULT_SMS_PROVIDER`.  
- Email: `EMAIL_PROVIDER` (`resend`|`sendgrid`), `RESEND_API_KEY` or `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`.  
- Auth/Security: `SESSION_SECRET`, `CRON_SECRET`, optional `BYPASS_AUTH` for local only.  
- App URLs & IDs: `NEXT_PUBLIC_APP_URL`, `INBOUND_CAMPAIGN_ID`.  
See `.env.example` for the full annotated list.

## Frontend criteria (quick reference)
- Auth/front-door: centralized portal routes for signin/signup/request-access and NDA gating; RBAC tiles; middleware-enforced roles.
- Voice/SMS: inbound flow rings browser + forwardNumber with voicemail fallback and notifications; outbound via Twilio Device + `/api/twilio/voice/outbound-connect`; signature validation toggle via `VALIDATE_TWILIO_SIGNATURE`.
- Design language: glass/neon “command console” aesthetic, consistent card styling, strong sidebar grouping/active states, Tailwind tokens instead of ad-hoc CSS.
- QA/compliance: consent/DNC enforcement, webhook signature validation, rate limits on public APIs, recording/voicemail callbacks wired with audit trails.

## Documentation consolidation
- This README is the canonical storefront doc. Prior Markdown files are summarized here:
  - **FRONTDOOR_STRUCTURE.md:** Auth portal blueprint (Stack auth, RBAC router, NDA/request-access flows).
  - **INBOUND_CALLS.md:** Inbound voice playbook (Twilio Client + forward number, voicemail fallback, notifications, auto lead/contact creation).
  - **UI_UX_OVERHAUL_PLAN.md:** Command-console UI/UX modernization (glass/neon tokens, hierarchy, sidebar/menu improvements).
  - **FIXES_APPLIED.md:** Historical fix log (e.g., voicemail drop, Twilio client singleton, dialer updates); retain via git history for audit.

## Architecture and data flow
- App Router: routing under `app/`; shared providers wired in `app/layout.tsx` and `components/ReactQueryProvider.tsx`.
- Data: Prisma client from `lib/db.ts`; domain helpers in `lib/*` (calls, sms, notifications, telemetry, sequences, quiet-hours, DNC, masking).
- Realtime: SSE endpoint `/api/sse/agent-events`; push subscriptions `/api/push/*`; notifications consolidated in `lib/notifications.ts`.
- Voice/SMS: Twilio Voice SDK via `components/TwilioCallProvider.tsx` and `lib/twilio-*`; SMS queue/send/lead helpers in `lib/sms.ts`, `lib/calls.ts`, `/api/sms/*`.
- Telemetry/audit: `/api/audit/*`, `/api/telemetry/*` plus helpers `lib/audit.ts`, `lib/telemetry.ts`.

## File layout (summary)
- `app/`
  - `page.tsx`, `layout.tsx`, `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`.
  - `api/` (29 groups): admin (users, kpis, contracts, import, quality-scores, live-calls), agent (stats/status), agents, audit, automations, caller-ids, campaigns, cron (callback-reminders, send-scheduled, release-expired-locks, process-sequences, cleanup-expired), dashboard/live, dnc (check), email (send), events, health (ready), integrations (twilio), leads (list/detail), notifications (read/read-all), properties (detail), push (subscribe/unsubscribe/vapid-key), qa, scheduled-messages (list/detail), search, sequences (list/detail), settings, sms (call, callbacks, integration-status, leads, queue, send), sse/agent-events, telemetry (ingestion/webhooks), templates (list/detail), twilio (token/voice/voicemail-drop), webhooks (twilio, eztexting, sendgrid, email).
  - `dashboard/`: admin (agents, automations, campaigns, contracts, dnc, import, integrations, kpis, users), agent, manager/live, campaigns, chat/[id], inbox, intelligence (charts; some static), queue, reports (stub), settings, shared layout/loading.
  - `sms/`: queue, dial/[leadId], callbacks, history, shared layout.
  - `leads/[leadId]/page.tsx`: lead detail surface.
- `components/` UI and feature modules: chat/, dashboard/, sms/, notifications/, ui/ (design system). Key atoms: `TwilioCallProvider`, `TwilioCallButton`, `FloatingDialer`, `ReplyComposer`, `LeadDetailSlideOver`, `IncomingCallModal`, `CommandDrawer`, `NotificationsPanel`, `ToastProvider`, `ReactQueryProvider`.
- `lib/` service layer: `api.ts`, `auth.ts`, `calls.ts`, `sms.ts`, `twilio-*` (auth/client/parser/webhook), `notifications.ts`, `push-notifications.ts`, `quiet-hours.ts`, `rate-limit.ts`, `retry.ts`, `intent-classifier.ts`, `scoring.ts`, `lead-queue.ts`, `telemetry.ts`, `audit.ts`, `events.ts`, `dnc.ts`, `integrations.ts`, `pii-masking.ts`, `phone-utils.ts`, `email.ts`, `contracts.ts`, `password.ts`, `logger.ts`, plus helpers in `utils.ts`, `theme.ts`, `mocks.ts`.
- `hooks/` reusable client hooks (React Query wrappers, UI state).
- `prisma/schema.prisma` — synced from backend master via root `npm run db:sync`.
- `docs/` — design/UX notes (`UI_UX_OVERHAUL_PLAN.md`).
- `scripts/test-apis.js` — quick local API probe.
- `public/` — static assets; `vercel.json` for deploy headers/rewrites.
- `middleware.ts` — route protection and role gating.

## Auth, roles, and security
- Login actions set `mae_user` and `mae_role`; `middleware.ts` blocks `/dashboard*` without auth and restricts `/dashboard/admin/*` to ADMIN.
- Roles: ADMIN (all), MANAGER (manager/live, reports, campaigns), AGENT (inbox, chat, queue), CALLER (SMS queue/dialer). UI hides routes per role.
- Webhooks: enable `VALIDATE_TWILIO_SIGNATURE=true` with `TWILIO_WEBHOOK_URL` in production; EzTexting/SendGrid webhooks terminate under `/api/webhooks/*`.
- Rate limiting shared via `lib/rate-limit.ts` and used by API handlers.

## Deployment (Vercel)
- Set project root to `frontend/`; default build (`npm run build`) is sufficient.
- Provide all env vars above; ensure `DATABASE_URL` is pooled (`pgbouncer=true`). If migrations are required in CI/preview, also supply `DIRECT_URL`.
- After schema changes in backend: run root `npm run db:sync`, commit `frontend/prisma/schema.prisma`, then deploy.

## Notes and known edges
- Recharts small charts log a build-time size warning; set `minHeight/minWidth` to silence.
- Tailwind output is in `app/generated.css`; do not hand-edit it.
- SSE/push endpoints stream responses; keep them in API routes/server components only.
