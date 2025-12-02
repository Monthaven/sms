**Recreate Postgres Migrations — Safe Flow**

Purpose: Replace the existing sqlite-based Prisma migration history with a fresh Postgres migration history so CI (`prisma migrate deploy`) succeeds.

High level:
- Move existing `prisma/migrations` to a backup folder (non-destructive).
- Generate a new migration history against a Postgres instance using `prisma migrate dev` and commit the generated `prisma/migrations` folder.
- Open a PR and run CI to validate.

Files added to help:
- `backend/scripts/recreate-postgres-migrations.sh` — Bash script to move migrations to a timestamped backup and echo next steps.
- `backend/scripts/recreate-postgres-migrations.ps1` — PowerShell equivalent for Windows.

Recommended steps (detailed)

1) Create a maintenance branch

   git checkout -b chore/reinit-postgres-migrations

2) Run the provided script to move existing migrations to a backup

   # Linux / macOS / WSL
   bash backend/scripts/recreate-postgres-migrations.sh

   # Windows PowerShell
   pwsh -File backend/scripts/recreate-postgres-migrations.ps1

   This will move `prisma/migrations` to `prisma/migrations_sqlite_backup_<timestamp>`.

3) Commit the backup change

   git add -A
   git commit -m "chore: move sqlite prisma migrations to backup"

4) Generate Postgres migrations locally

   - Start a local Postgres (docker-compose or Docker):

     docker run --rm -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=monthaven -p 5432:5432 postgres:15

   - Export `DATABASE_URL` (or set `DIRECT_URL`) to point to that Postgres instance:

     export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monthaven"

   - Generate the migration history and apply it to the local Postgres:

     npx prisma migrate dev --schema=prisma/schema_postgres.prisma --name init_postgres

   - Inspect `prisma/migrations`; verify SQL and timestamps.

5) Commit the new Postgres migrations and push the branch

   git add backend/prisma/migrations
   git commit -m "chore(migrations): add initial Postgres migrations"
   git push origin HEAD

6) Open a PR against `main` (or the target branch)

   - CI should now run `prisma migrate deploy` successfully.
   - Review any CI migration outputs and run database checks in staging before applying to production.

Important safety notes

- This process rewrites the migration history in the repository. If production has applied the current sqlite migrations (unlikely) or any DBs depend on the historical migration files, you must coordinate carefully and take DB backups before applying new migrations.
- Prefer applying the new migrations to a disposable staging DB first.
- If you need me to produce SQL diffs or help port data between schemas, I can help, but it requires a staging Postgres instance.

If you'd like, I can open the maintenance branch and commit these helper scripts and README for you — confirm and I'll push the changes and open a PR draft named `chore/reinit-postgres-migrations`.
