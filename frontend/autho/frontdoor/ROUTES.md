# Routes & Flows (Front-Door)
Authoritative map of the entrypoints and expected behaviors for the auth portal.

## Public routes
- `/signin` — primary login; honors `?next=/target`.
- `/signup` — account creation; may redirect to `/awaiting-approval` until membership accepted.
- `/request-access` — manual invite flow.
- `/nda-complete`, `/nda-declined` — DocuSign callbacks.
- `/api/auth/stack/*` — Stack Auth endpoints (session/migrate).
- `/api/auth/google/*` — Google OIDC endpoints (optional).
- `/documents` — required-docs list; users with pending docs are redirected here after membership acceptance.

## Protected routes
- `/` → redirects to `/dashboard` (or `/` landing if you keep only tiles).
- `/dashboard` — optional internal home (copy from main repo if desired).
- `/portal` (or `/` landing) — role-gated tiles; see `app/(portal)/page.tsx`.
- `/admin` — admin-only.
- `/intel/final/[dealId]` — NDA-gated; requires `hasUserNdaForDeal` + membership accepted.
- Everything else under `(portal)` inherits middleware gating.

## Middleware expectations
- If no session → redirect to `/signin?next=...`.
- If membership not accepted → redirect to `/awaiting-approval` except for public paths.
- If membership accepted but pending required docs → redirect to `/documents?next=...`.
- For `/intel/final/[id]`: requires NDA; redirects to `/intel/[id]/sign-nda` preserving `next`.
- Public allowlist: `/signin`, `/signup`, `/request-access`, `/nda-*`, `/api/auth/*`, assets/static.

## Deep link behavior
- Append `?next=/intel/final/abc` to any login link; middleware preserves and redirects post-auth.
- Subdomains (`sms.`, `om.`, `deals.`) should point to `https://auth.monthavencapital.com/signin?next=...` to avoid double-login.

## Token & claim expectations
- Session cookie name (Stack): `stack_session`; domain: `.monthavencapital.com`; `SameSite=None; Secure`.
- Claims: `sub` (user id), `role` (string), optional `roles` (string array), `membership_status` (`pending|accepted|rejected`), plus any custom claims you add (org/team).
- RBAC resolves from `role` + `roles` → permissions via `packages/security/roles.ts`.
