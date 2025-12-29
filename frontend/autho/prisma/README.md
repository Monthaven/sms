# Prisma Setup (Front Door)
This folder holds a Prisma schema and seed for the unified auth/portal domain. Use it if you’re moving the front-door tables (users/roles/docs) to Prisma.

## Files
- `schema.prisma` — models for users, roles, user_roles, access_grants, ndas, documents, user_documents, audit_logs, webhook_events, final_documents.
- `seed.ts` — seeds roles and document kinds.

## Usage
1) Set `DATABASE_URL` to your Neon/Postgres connection.
2) Run `npx prisma migrate dev` (or `migrate deploy` in CI) from this folder after copying `schema.prisma` into your main Prisma project.
3) Seed roles/docs:
   ```
   npx prisma db seed --schema=./schema.prisma --preview-feature
   ```
4) Align envs with the front-door app (`STACK_*`, cookie domain `.monthavencapital.com`, `DOCS_WEBHOOK_SECRET`/`DOCUSIGN_HMAC_SECRET`).

## Notes
- If you already have user tables, reconcile field names before migrating.
- Keep a single migration pipeline across apps to avoid drift.***
