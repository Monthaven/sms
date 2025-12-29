# Monthaven Capital Intel Portal

Premium NDA-gated platform for interactive Offering Memorandums, financial analysis, and AI-assisted deal intelligence. Built for institutional investors with a glassmorphism UI system and strict security gates.

---

## Contents
- Overview
- Architecture
- Tech Stack
- Project Structure
- Data & Schema
- Auth & Security
- Notion Sync
- AI & Scoring
- UI System (Monthaven Glass)
- Environment
- Development Workflow
- Scripts
- Testing & Quality
- Deployment
- Troubleshooting
- Docs & Roadmap

---

## Overview
- Next.js 15 App Router with Server Components by default; `use client` only for required interactivity.
- Neon Postgres as the source of truth, Drizzle ORM for runtime queries, Prisma kept for schema/migrations where needed.
- Stack Auth for identity plus local `access_grants` for permissions; middleware enforces access cookies on `/om` and intel routes.
- Notion is the headless CMS; all sync runs server-side via scripts (frontend never calls Notion).
- Glassmorphism design system with fluid typography, ambient lighting, and financial-grade displays.

## Architecture
- **Frontend:** App Router under `app/` with gated portal routes (`/om`, `/oms`, `/dashboard`, `/awaiting-approval`, `/pending-approval`), public signin/signup, and admin tools.
- **API:** Route handlers in `app/api/*` for auth, deals, OM data, uploads, health checks, AI scoring, and admin operations.
- **Data Layer:** Drizzle schema in `db/schema.ts` (deals + OM tables + versions) plus legacy/shared auth schema in `packages/db/schema.ts`. Database access exported from `@/db`.
- **Security Gates:** Stack Auth JWT → middleware cookie check (`intel_session` or `stack-access`) → page-level `canAccessDeal` permission checks.
- **Caching:** Public-facing queries should be wrapped in `unstable_cache` with tags like `["deal-slug"]` or `["oms-list"]` where applicable.

## Tech Stack
- **Framework:** Next.js 15.5 (App Router), React 19.2, TypeScript 5.6+, Node >= 20.9.
- **Database:** Neon Postgres; Drizzle ORM for runtime; Prisma schema retained for generation/migrations.
- **Auth:** Stack Auth (RS256 JWKS) + local `access_grants` enforcement.
- **Styling:** Tailwind CSS, Monthaven Glass system, fluid typography via CSS variables; Motion for animations; Lucide icons.
- **Integrations:** Notion API (CMS), Google Maps, Netlify Blobs (permanent asset storage), Puppeteer core for PDF, Vercel/Netlify blobs helpers.
- **AI:** `@ai-sdk/openai` and `ai` package for structured outputs.

## Project Structure (high level)
- `app/` – App Router entrypoints. Key routes: `/om`, `/om/[slug]`, `/oms` gallery, `/dashboard`, `/login`, `/awaiting-approval`, `/pending-approval`, `/admin/*`, `/api/*`, Stack handlers under `/handler/[...stack]`.
- `components/` – UI primitives (`components/ui`), OM-specific UI (`components/om`), motion, layout, and cards.
- `db/` – Drizzle schema and db entrypoint.
- `lib/` – Auth helpers (`lib/auth`), Notion utilities and parsers (`lib/notion/*`), OM data utilities (`lib/om/*`), AI scoring (`lib/ai/deal-scorer.ts`), database shims.
- `packages/db/` – Legacy/shared auth schema (`users`, `access_grants`, `audit_logs`).
- `scripts/` – Notion → Neon sync (`sync-notion-to-neon.ts`, `sync-deals-from-notion.ts`), diagnostics, seeds, migration helpers, and sync automation.
- `docs/` – System audits and roadmap (`SYSTEM_AUDIT_2024.md`, `REVOLUTIONARY_ROADMAP.md`, archives).
- `inngest/`, `hooks/`, `generated/` – Background jobs (current/legacy), shared React hooks, generated assets/types.

## Data & Schema
- **Core tables:** `deals` (slugged properties), `om_versions`, `om_model_constants`, `om_unit_mix`, `om_t12_financials`, `om_rent_comps`, `om_sales_comps`, `om_gallery_images`, `om_points_of_interest`, `om_employment_anchors`, `om_observations`, plus extended OM analytics tables.
- **Auth tables:** `users`, `access_grants`, `audit_logs` live in `packages/db/schema.ts`. Keep foreign keys in sync when relating to OM data.
- **Versioning:** `om_versions` ties OM content to a deal; child tables reference the version or deal as defined in `db/schema.ts`.
- **Guidance:** Do not store expiring Notion asset URLs; sync pipelines must persist permanent blob URLs before writing to Postgres.

## Auth & Security
- **Gate 1 (Edge):** Stack Auth validates identity and issues JWTs.
- **Gate 2 (Middleware):** `middleware.ts` checks `intel_session` (issued only if `access_grants.active = true`) or `stack-access`; unauthenticated users are redirected to `/login` with redirect param.
- **Gate 3 (Page/Domain):** `canAccessDeal` enforces resource-level access (status, permissions). Admin approval happens via `/admin/approve` using `ADMIN_APPROVAL_TOKEN`.
- **Sessions:** Auth cookies are the source of truth; never bypass by seeding DB manually.

## Notion Sync
- Source of truth is Notion. Frontend never calls Notion directly.
- Main script: `scripts/sync-notion-to-neon.ts`; deal-specific: `scripts/sync-deals-from-notion.ts`; helpers for db checks under `scripts/check-*.ts`.
- Defensive parsing is required: use helpers in `lib/notion/parsers` instead of direct property access.
- Asset handling: download and store in Netlify Blobs (or R2) during sync; do not persist transient Notion URLs.
- Run `npm run sync` for full sync, or `npm run sync:test -- <page-uuid>` for a single property.

## AI & Scoring
- `lib/ai/deal-scorer.ts` defines structured scoring (overall score, recommendation, factors, highlights/concerns, comparable deals, key metrics).
- API route `app/api/ai/score-deal/route.ts` exposes the scoring service; uses `@ai-sdk/openai` with Zod schemas for typed outputs.

## UI System (Monthaven Glass)
- Use `GlassCard` for all panels; avoid raw opaque containers.
- Financial data must use `MetricDisplay` and `tabular-nums` to avoid jitter.
- Typography uses fluid `clamp()` scales defined in `app/globals.css` (use Tailwind semantic sizes like `text-xl`, `text-3xl`).
- Ambient lighting lives in `app/layout.tsx`; do not cover it with solid backgrounds.
- Components live under `components/ui` and `components/om`; prefer Server Components unless interactivity requires client components.

## Environment
- Copy `.env.example` to `.env.local` for development; `.env` and `.env.production` are present for deployed contexts.
- Required core vars: `DATABASE_URL` (Neon), Stack Auth keys (`NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`, `STACK_AUTH_JWKS_URL`), Notion tokens/db IDs, Google Maps key (for maps), Netlify/Vercel blob credentials as applicable.
- Node engine: `>=20.9`. Lockfile is npm (`package-lock.json`).

## Development Workflow
1) `npm install`
2) `cp .env.example .env.local` and fill credentials
3) Generate Prisma client if needed: `npm run db:generate`
4) Sync data: `npm run sync`
5) Start dev server: `npm run dev`

## Scripts (package.json)
- Dev/build: `npm run dev`, `npm run build`, `npm run start`
- Quality: `npm run lint` (soft fail), `npm run typecheck`
- Database: `npm run db:generate`, `npm run db:migrate`, `npm run db:push`, `npm run db:seed`, `npm run db:reset`
- Sync: `npm run sync`, `npm run sync:notion-deals`, `npm run sync:test -- <page-uuid>`, `npm run sync:all`
- Checks: `npm run check:notion-env`, `npm run check:notion-dbs`, `npm run schema:smoke`
- Storybook: `npm run storybook`, `npm run build-storybook`
- Workers/ingest: `npm run worker:process-webhooks`
- Tests: `npm test` (Node test runner)

## Testing & Quality
- Type safety: `npm run typecheck` must be clean.
- Lint: `npm run lint` (configured to not block builds but should be addressed).
- Build: `npm run build` should succeed with zero TypeScript errors before deployment.
- Avoid `any`; add types in `types/` when complexity rises.

## Deployment
- Primary target: Netlify (`netlify.toml`), Node 22 env. Alternative Vercel configs available.
- Ensure env vars are set, database migrations applied, and Notion sync executed before promoting.

## Troubleshooting
- Database connectivity: `npm run check:notion-env` and `scripts/check-database-access.ts` (via `tsx`).
- Notion sync issues: `npm run check:notion-dbs`, `DEBUG_NOTION_PROPS=1 npm run sync`.
- Missing OM data: `scripts/check-om-by-slug.ts <slug>` and `scripts/check-all-om-data.ts`.
- Auth issues: verify JWKS URL and clear cookies; middleware requires `intel_session` or `stack-access`.

## Docs & Roadmap
- Operating guides: `docs/SYSTEM_AUDIT_2024.md`, `docs/REVOLUTIONARY_ROADMAP.md`, `AGENTS.md` for assistant instructions.
- Design references: `app/globals.css`, `components/ui/GlassCard.tsx`, `components/ui/MetricDisplay.tsx`, `app/layout.tsx`.
- Data flow references: `db/schema.ts`, `packages/db/schema.ts`, `lib/notion/*`, `scripts/sync-notion-to-neon.ts`.

---

*Built with precision by Always Improving LLC (2025).*
