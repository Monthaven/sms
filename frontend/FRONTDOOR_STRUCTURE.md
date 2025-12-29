# Front-Door Auth Portal Blueprint
Centralized login + RBAC router for `auth.monthavencapital.com` (or `portal.monthavencapital.com`) that fronts SMS, OM/Investors, and Deals. Keep existing Stack Auth wiring and glass UI; this adds structure, routes, and RBAC helpers to drop in without touching product apps.

## File / Folder Layout (place inside existing Next.js app)
```
app/
  (auth)/
    layout.tsx                # Reuse existing glass shell layout
    signin/page.tsx           # Existing screen; honors ?next= for deep links
    signup/page.tsx
    request-access/page.tsx
    nda-complete/page.tsx
    nda-declined/page.tsx
    invite/page.tsx
  (portal)/
    layout.tsx                # Reuse current portal layout (TopNav/SideNav)
    page.tsx                  # NEW landing; renders role-based tiles/links
    dashboard/page.tsx        # Optional internal home after login
    components/PortalTiles.tsx# NEW: tile grid fed by claims/roles
  api/
    auth/stack/*              # Keep: Stack Auth endpoints
    auth/google/*             # Keep: Google OIDC endpoints (optional)
middleware.ts                 # Keep: login/membership/NDA gates; add new publics only if needed
lib/
  auth/                       # Keep: get-session, admin utils
  rbac/                       # NEW (optional): thin wrapper helpers using packages/security/roles
packages/
  security/
    session.ts                # Keep: intel_session gate
    roles.ts                  # NEW: role→permission map + can()
stack-provider-wrapper.tsx    # Keep: wraps app with Stack providers
```

## RBAC Definition (`packages/security/roles.ts`)
```ts
// packages/security/roles.ts
export const rolePermissions = {
  admin: ["*"],
  manager: ["sms:callers:manage", "sms:send", "sms:scripts:edit", "deals:view"],
  caller: ["sms:send"],
  dev: ["sms:send", "deals:view"],
  investor: ["investor:read", "deals:view"],
  lender: ["lender:calc", "investor:read"],
  vendor: ["vendor:view"],
  om_ops: ["om:view", "om:docs:view", "deals:view"],
  sms_ops: ["sms:send", "sms:scripts:edit"],
  deals_ops: ["deals:view", "deals:edit", "deals:loi", "deals:psa"],
} as const;

type Role = keyof typeof rolePermissions;
type Permission = (typeof rolePermissions)[Role][number] | "*";

export function permissionsForRoles(roles: string[] | undefined) {
  const perms = new Set<string>();
  for (const role of roles ?? []) {
    const key = role as Role;
    const list = rolePermissions[key];
    if (!list) continue;
    if (list.includes("*")) return new Set(["*"]);
    list.forEach((p) => perms.add(p));
  }
  return perms;
}

export function can(roles: string[] | undefined, permission: string) {
  if (!roles?.length) return false;
  const perms = permissionsForRoles(roles);
  return perms.has("*") || perms.has(permission);
}
```

## Portal Landing (`app/(portal)/page.tsx`)
- Server component that reads the session via `getSessionFromRequest` or `/api/auth/stack/session`.
- Builds `roles` from claims (e.g., `session.claims.roles` or `session.role`) and feeds them into `can()`.
- Renders tiles (PortalTiles) only when `can()` allows:
  - SMS → `https://sms.monthavencapital.com` if `sms:*` or `caller`/`manager`/`sms_ops`.
  - OM/Investors → `https://om.monthavencapital.com` (optionally split investor view by `investor:read`).
  - Deals → `https://deals.monthavencapital.com` if `deals:*`/`deals_ops`/`admin`.
  - Admin → internal admin dashboard for `admin`/`manager`.
- Preserves `next` deep links and avoids secondary login prompts (shared cookie domain).

## Middleware Behavior (keep, adjust only PUBLIC_PATHS)
- `PUBLIC_PATHS`: `/signin`, `/signup`, `/request-access`, `/nda-*`, `/api/auth/*`, static assets. Add more only as needed.
- If no session → redirect to `/signin?next=...`.
- Root `/` → redirect to `/dashboard` or portal landing.
- Membership gate: `/awaiting-approval` until `session.membershipStatus === "accepted"`.
- NDA gate remains for `/intel/final/[dealId]` via `hasUserNdaForDeal`.

## Routing / SSO Flow
- Host: `auth.monthavencapital.com` (or `portal.monthavencapital.com`); cookies scoped to `.monthavencapital.com` with `SameSite=None; Secure` (Stack tokenStore already uses Next.js cookies).
- Product apps (`sms.`, `om.`, `deals.`, `investors.`) treat this app as IdP/authorize endpoint. Point their login to `/signin?next=/intended/path`.
- SSO: once logged in, crossing subdomains reuses the shared cookie; no extra prompts.

## Backend Enforcement Pattern
- API routes: call `getSessionFromRequest(req)` and `can(session.claims.roles, "sms:send")` (or a helper) to fail closed.
- Server components: read session in loaders before fetching data; redirect or 403 if unauthorized.
- Service-to-service: keep using gate JWT (`intel_session`) for NDA/deal access; do not pass user tokens between services except when explicitly acting on behalf.

## Environment + Config
- Required: `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`, `STACK_SECRET_SERVER_KEY`, `STACK_AUTH_JWKS_URL`.
- Optional: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID` for Google SSO.
- Cookie domain: configure to `.monthavencapital.com` (SameSite=None, Secure).

## Drop-In Steps
1) Add `packages/security/roles.ts` (above) and optionally `lib/rbac` thin helpers.
2) Create `app/(portal)/page.tsx` + `components/PortalTiles.tsx` rendering tiles from `can()`; reuse existing `TopNav`, `SideNav`, `portal.css`.
3) Keep auth pages under `(auth)`; reuse `app/(public)/layout.tsx` as `(auth)/layout.tsx`.
4) Ensure `middleware.ts` `PUBLIC_PATHS` align with the public auth routes.
5) Point product apps’ login flows to `/signin?next=...`; verify SSO and RBAC enforcement on API calls.

This blueprint is ready to drop into the repo; wire the two NEW files (`roles.ts`, portal landing) and reuse everything else unchanged.
