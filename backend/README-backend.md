# Backend Runbook (Infrastructure Notes)

The Engine is intended to run locally (Node + Neon). We no longer maintain a Dockerized API or SQLite schema. Use this page only if you need to spin up temporary Postgres instances for testing Prisma migrations.

## Local Postgres dry-run (optional)
If you need to validate Prisma migrations against a disposable Postgres instance:

```powershell
docker run --name monthaven-dev-pg `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=monthaven `
  -p 5432:5432 -d postgres:15

$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/monthaven?schema=public'
cd backend
npx prisma generate
npx prisma migrate deploy
```

Stop + remove when done:
```powershell
docker rm -f monthaven-dev-pg
```

## Notes
- Preferred workflow is still Neon (remote) + local scripts; Docker is optional for dry-runs.
- If you can’t run Docker locally, create migrations against Neon directly (`prisma migrate dev`) and baseline as needed.
- All other instructions now live in the primary backend README and the root README.***
