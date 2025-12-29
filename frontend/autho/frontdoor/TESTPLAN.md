# Test Plan (Front-Door Auth + RBAC)
Use this to validate the drop-in front-door. Adapt URLs if you host elsewhere.

## Preflight
- Env set: `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`, `STACK_AUTH_JWKS_URL`, cookie domain `.monthavencapital.com`.
- Seed users with roles: admin, manager, caller, investor, lender, vendor, om_ops, sms_ops, deals_ops, dev.
- Ensure Stack session cookie set for `.monthavencapital.com` (SameSite=None; Secure).

## Login & session
1) Visit `/signin` without session → see login form; submit valid Stack creds → redirected to `/dashboard` or `next`.
2) Visit `/signin?next=/tools` → after login, land on `/tools`.
3) Clear cookies → hit `/dashboard` → redirected to `/signin?next=/dashboard`.

## Membership gate
1) User with `membership_status=pending` → any portal route redirects to `/awaiting-approval`.
2) Same user after status flipped to `accepted` → reaches portal landing.
3) Accepted user with pending `user_documents` → redirected to `/documents?next=...` until all required docs are signed.

## Role-gated tiles (app/(portal)/page.tsx)
- Admin: sees all tiles (SMS, OM/Investors, Deals, Admin, Dev).
- Caller: sees SMS only.
- Manager: sees SMS + Admin.
- Investor: sees OM/Investors; no SMS/Deals tiles.
- Deals ops: sees Deals; not Admin unless role added.
- Dev: sees Dev tile (and anything their permissions grant).

## NDA gate
1) Accepted member without NDA visits `/intel/final/{id}` → redirected to `/intel/{id}/sign-nda?next=/intel/final/{id}`.
2) After NDA recorded, same user loads `/intel/final/{id}` successfully.

## Document gate
- Seed documents/user_documents for a user; ensure status=pending → user redirected to `/documents`.
- Mark doc signed (status=signed) → user can reach portal landing; `/documents` shows updated badge.
- `POST /api/docs/request-sign` returns token/userDocumentId; `POST /api/docs/verify` with token/id marks signed; `/api/docs/webhook` with valid HMAC updates status to signed.

## API enforcement (spot checks)
- Protect one SMS POST route with `can(session, "sms:send")`; caller/manager passes, investor denied (403).
- Protect Deals mutation with `can(session, "deals:edit")`; deals_ops/admin pass, caller denied.

## Cross-subdomain SSO
1) Login at `https://auth.monthavencapital.com/signin?next=/dashboard`.
2) Navigate to `https://sms.monthavencapital.com` → no second login; session reused.
3) Navigate to `https://om.monthavencapital.com` → no second login; role-appropriate UI.

## CSRF/refresh sanity
- Verify cookies are `Secure` and `SameSite=None`; API calls use Authorization header or CSRF token per your app pattern.

## Regression checks
- `/api/auth/stack/session` returns redirect and applies gate cookies.
- Static assets and `/favicon.ico` bypass middleware.
- Accessibility: skip link works; tiles have accessible text; focus states visible.
