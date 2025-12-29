# Monthaven Unified Front Door & App Suite
Centralized authentication and role-aware routing for all Monthaven subdomains, plus reference docs for SMS/OM/Deals/Investors. This repo folder holds the drop-in front-door scaffold (`autho/frontdoor`) and product readmes (`autho/sms*`, `autho/Om*`).

## What’s here
- `frontdoor/` — Complete SSO/RBAC/doc-gate scaffold for `auth.monthavencapital.com` (or `portal.monthavencapital.com`):
  - Portal landing with role-gated tiles to `sms.`, `om.`, `deals.`, `investors.`.
  - RBAC map (`packages/security/roles.ts`) + helpers (`lib/rbac`).
  - Doc gating: schema for documents/user_documents/audit logs; middleware redirect to `/documents`; documents page showing required signatures.
  - Routes, env, copy list, and test plan (`ROUTES.md`, `ENVS.md`, `COPYLIST.md`, `TESTPLAN.md`, `README.md`).
- `sms Readme.md` — MAE/SMS platform reference.
- `Om Readme.md` / `Om Re` — OM portal reference.

## High-level plan (drop-in sequence)
1) **Copy required files** (see `frontdoor/COPYLIST.md`) into the main Next.js app:
   - Keep existing auth pages (`/signin`, `/signup`, `/request-access`, `/nda-*`, `/invite`), portal layout/nav, stack handlers, and auth API routes.
   - Add new landing/tiles, doc page, RBAC helpers, and doc schema/helpers.
2) **DB migration**: apply schema additions (roles, user_roles, documents, user_documents, audit_logs, document_status enum). Seed roles and document kinds (e.g., `nda`, `psa`, `loi`, `kyc`).
3) **Env/cookies**: set `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`, `STACK_AUTH_JWKS_URL`; cookie domain `.monthavencapital.com`, SameSite=None; Secure.
4) **Routing**: host at `auth.monthavencapital.com` (or `portal.`). Update subdomain login links to `/signin?next=/target`. Middleware enforces login → membership → docs → NDA (for `/intel/final/[id]`).
5) **RBAC enforcement**: use `packages/security/roles.ts` + `lib/rbac` in API routes (e.g., `sms:send`, `deals:edit`, `investor:read`). UI hides options client-side; server fails closed.
6) **Doc signing**: create `user_documents` per required kind; middleware redirects accepted users with pending docs to `/documents`; surface sign links via metadata (`signUrl`) or HMAC-signed URLs; update status via webhook/API.
7) **Test**: follow `frontdoor/TESTPLAN.md` for login, membership gate, doc gate, NDA gate, role-gated tiles, and cross-subdomain SSO.

## Subdomain targets
- SMS: `https://sms.monthavencapital.com`
- OM/Investors: `https://om.monthavencapital.com` (add `investors.` if split)
- Deals: `https://deals.monthavencapital.com`
- Front door: `https://auth.monthavencapital.com` (or `portal.monthavencapital.com`)

## Notes
- Keep code modular: auth, RBAC, docs, schema, and UI remain separate for maintainability.
- Audit logs are included in schema; consider writing to them on login/doc events.
- HMAC helpers exist for DocuSign verification (`lib/hmac.ts` in main app); reuse for doc webhooks.

## File structure (autho/)
```
autho/
  README.md                  # Master plan (this file)
  sms Readme.md              # SMS/MAE reference
  Om Readme.md               # OM portal reference
  Om Re                      # (reference doc placeholder)
  frontdoor/
    README.md                # Front-door integration guide
    COPYLIST.md              # Files to copy from main app + new ones
    ROUTES.md                # Route/middleware map
    TESTPLAN.md              # Validation steps
    ENVS.md                  # Env/cookie requirements
    middleware.ts            # Reference middleware with doc gate
    app/(portal)/
      page.tsx               # Landing with role-gated tiles
      portal.css             # Tile/grid styles
      components/PortalTiles.tsx
      documents/page.tsx     # Required-docs list/status/sign links
    lib/
      auth/pending-docs.ts   # Doc gate helper
      rbac/index.ts          # Role extraction + can()
    packages/
      security/roles.ts      # Role→permission map
      db/
        schema.ts            # Roles, user_roles, documents, user_documents, audit_logs
        types.ts
        documents.ts         # Ensure/list/update user docs
```
