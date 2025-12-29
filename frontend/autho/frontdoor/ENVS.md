# Env & Cookie Requirements

## Required
- `NEXT_PUBLIC_STACK_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`
- `STACK_AUTH_JWKS_URL` (or `STACK_JWKS_URL`)

## Optional
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` (if enabling Google SSO)
- `INTEL_SYNC_ADMIN_EMAILS` (allowlist for admin sync actions if used elsewhere)
- `DOCS_WEBHOOK_SECRET` (generic HMAC for /api/docs/webhook when not using DocuSign)
- `DOCUSIGN_HMAC_SECRET` (if using DocuSign webhook verification)

## Cookies
- Session cookie: `stack_session`
- Domain: `.monthavencapital.com`
- Flags: `Secure`, `SameSite=None`, `HttpOnly` (Stack sets these)

## Notes
- Keep Node ≥ 20.9 (per package.json engines).
- Configure your reverse proxy/hosting to honor the cookie domain across subdomains (`sms.`, `om.`, `deals.`).
