# Monthaven Front-Door Auth Portal (Drop-In Scaffold)
Centralized login and role-aware routing for SMS, OM/Investors, and Deals. This folder holds copy/paste-ready files to stand up `auth.monthavencapital.com` (or `portal.monthavencapital.com`) without touching the rest of the stack. All code assumes the existing Next.js + Stack Auth + Drizzle setup from the main repo; aliases (`@/`) should be kept the same when you drop files in.

## Contents
- `app/(portal)/page.tsx` — Portal landing that reads Stack session cookies, surfaces membership/roles, and renders role-gated tiles to downstream apps.
- `app/(portal)/components/PortalTiles.tsx` — Tile grid UI with glass styling and motion.
- `app/(portal)/portal.css` — Additional styles for the tiles (extend your existing portal CSS).
- `app/(portal)/documents/page.tsx` — Required-docs list for NDA/PSA/LOI/KYC with status and sign links.
- `packages/security/roles.ts` — Canonical role→permission map and `can()` helper.
- `lib/rbac/index.ts` — Thin helpers to extract roles from Stack JWT claims and check permissions via `roles.ts`.
- `lib/auth/pending-docs.ts` — Helper to gate routes until required docs are signed.
- `middleware.ts` (optional copy pattern) — Keep your existing middleware; only adjust `PUBLIC_PATHS` if you add new public routes.
- `packages/db/schema.ts` (roles, user_roles, documents, user_documents, audit_logs) and `packages/db/documents.ts` (ensure/list/update doc status).
- **Copy these from the main repo** (not duplicated here): `app/(public)/**` auth pages, `app/(portal)/layout.tsx`, `app/(portal)/TopNav.tsx`, `SideNav.tsx`, `breadcrumbs.tsx`, `app/globals.css`, `app/(portal)/portal.css` base styles, `app/stack/*`, `app/api/auth/stack/*`, `app/api/auth/google/*`, `lib/auth/*`, `packages/security/session.ts`, `packages/security/signed-url.ts`, `lib/jwt-gate.ts`.
- New doc APIs: `app/api/docs/request-sign`, `app/api/docs/verify`, `app/api/docs/webhook` (HMAC/DocuSign) to manage user_documents lifecycle.

## How to use
1) Copy files into your Next.js app respecting the same paths (create folders if missing).
2) Ensure env is set: `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`, `STACK_AUTH_JWKS_URL`. For Google SSO: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID`.
3) Configure cookie domain to `.monthavencapital.com` with `SameSite=None; Secure`.
4) Point subdomains to this front door: `/signin?next=/target/path`.
5) Smoke-test: log in once, jump between `sms.`, `om.`, `deals.` — tiles and APIs should respect RBAC; no second login prompts.

## Role/Permission Matrix (mirrors `roles.ts`)
- Roles: `admin`, `manager`, `caller`, `dev`, `investor`, `lender`, `vendor`, `om_ops`, `sms_ops`, `deals_ops`.
- Permissions: `sms:send`, `sms:scripts:edit`, `sms:callers:manage`, `om:view`, `om:docs:view`, `om:docs:edit`, `deals:view`, `deals:edit`, `deals:loi`, `deals:psa`, `investor:read`, `lender:calc`, `vendor:view`.

## Notes
- UI adheres to the Monthaven glass system; no bare bordered divs.
- Backend enforcement should continue to live in API handlers and middleware using the `can()` helper.
- Tiles are capability-driven; admin sees everything, others see only mapped destinations.
- Document gate: middleware can redirect accepted members with pending `user_documents` to `/documents` until required signatures are completed (see `lib/auth/pending-docs.ts`).
