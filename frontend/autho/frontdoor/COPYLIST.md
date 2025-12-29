# Front-Door Copy List (from main repo)
Use this checklist to assemble the front-door in your live Next.js app. Paths below are from the main repo; mirror them when copying into the target app.

## Must copy as-is (existing)
- `app/(public)/signin/**`
- `app/(public)/signup/**`
- `app/(public)/request-access/**`
- `app/(public)/nda-complete/**`
- `app/(public)/nda-declined/**`
- `app/(public)/invite/**`
- `app/(public)/layout.tsx`
- `app/(portal)/layout.tsx`
- `app/(portal)/TopNav.tsx`
- `app/(portal)/SideNav.tsx`
- `app/(portal)/breadcrumbs.tsx`
- `app/(portal)/CommandK.tsx`
- `app/(portal)/portal.css` (base styles)
- `app/(portal)/documents/page.tsx` (new: required-docs list)
- `app/globals.css`
- `app/stack/server.ts`
- `app/stack/client.ts`
- `app/stack-provider-wrapper.tsx`
- `app/api/auth/stack/*`
- `app/api/auth/google/*`
- `lib/auth/get-session.ts`
- `lib/auth/utils.ts`
- `lib/auth/pending-docs.ts` (doc gate helper)
- `lib/jwt-gate.ts`
- `lib/nda/check.ts`
- `packages/security/session.ts`
- `packages/security/signed-url.ts`
- `packages/db/schema.ts` (roles, user_roles, documents, user_documents, audit_logs)
- `packages/db/documents.ts`
- `app/api/docs/request-sign/route.ts`
- `app/api/docs/verify/route.ts`
- `app/api/docs/webhook/route.ts`

## Add from this scaffold
- `app/(portal)/page.tsx` (landing tiles)
- `app/(portal)/components/PortalTiles.tsx`
- `app/(portal)/portal.css` additions (merge with your base)
- `lib/rbac/index.ts`
- `packages/security/roles.ts`
- `middleware.ts` (use your current one; refer to this copy if you need the same gates)
- `README.md` (this folder) for env/config and flow notes
- `ROUTES.md`, `TESTPLAN.md`, `ENVS.md` (process docs)

## Optional (nice to have)
- `app/(portal)/dashboard/page.tsx` if you want an internal home after login (copy from main repo).
- Any shared UI primitives already present (cards, badges, motion components).

## Env checklist
- `NEXT_PUBLIC_STACK_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`
- `STACK_AUTH_JWKS_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` (if using Google)
- Cookie domain set to `.monthavencapital.com` with `SameSite=None; Secure`
