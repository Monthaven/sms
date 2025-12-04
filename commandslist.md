# Commands Reference — Monthaven Acquisition Engine (MAE)

This document collects all useful commands for developing, operating, and maintaining the MAE repository on Windows (PowerShell). Use these commands from the repository root (`C:\Users\Smooth King\Downloads\New folder (2)\sms\sms`).

**Notes:**
- PowerShell examples are provided. On other shells (bash, zsh) adapt quoting and path separators.
- `backend/prisma/schema.prisma` is the canonical schema source. Always edit that schema and run `npm run db:sync` to propagate changes to `frontend/prisma`.

**Quick file references:**
- `backend/`: local engine (TS scripts)
- `frontend/`: Next.js storefront (Vercel)
- `scripts/db-sync.cjs`: cross-platform db sync tool

**1. Repository / Git**
- Show status and branch:

```powershell
git status
git rev-parse --abbrev-ref HEAD
```

- Stage and commit (recommended commit message example):

```powershell
git add .
git commit -m "chore: finalize MAE hybrid architecture and README"
```

- Push to remote:

```powershell
git push origin main
```

- Inspect last commit:

```powershell
git log -1 --pretty=format:"%h %s (%an, %ar)"
```

- Soft-reset last commit (careful):

```powershell
git reset --soft HEAD~1
```

**2. Environment / .env**
- Backend requires a `backend/.env` with the direct Neon DB URL and any API credentials (EzTexting).
- Frontend (Vercel) must use the pooled Neon URL; set `DATABASE_URL` there to the pooler URL with `&pgbouncer=true`.

Example `backend/.env` (local only):

```text
DATABASE_URL="postgres://user:pass@HOST/neondb?sslmode=require"
EZTEXTING_USER="your_user"
EZTEXTING_PASS="your_pass"
```

Example `frontend` / Vercel env (use pooled URL):

```text
DATABASE_URL="postgres://user:pass@HOST-pooler/neondb?sslmode=require&pgbouncer=true"
```

**3. Install dependencies**
- From repo root: install in `backend` and `frontend` individually (recommended):

```powershell
cd backend; npm install; cd ..
cd frontend; npm install; cd ..
```

**4. Prisma and DB sync**
- The repo contains a cross-platform `db:sync` script that copies `backend/prisma/schema.prisma` -> `frontend/prisma/schema.prisma` and runs `prisma generate` for both projects using Prisma v5.

- Run the sync from the repo root:

```powershell
npm run db:sync
```

(If you need to run the script manually):

```powershell
node .\scripts\db-sync.cjs
```

- Run migrations (edit schema then run in `backend`):

```powershell
cd backend
npx prisma migrate dev --name add_some_field
```

- Generate client manually in backend or frontend (if needed):

```powershell
cd backend
npx prisma generate
# or for frontend
cd ../frontend
npx prisma generate
```

- Open Prisma Studio (inspect DB):

```powershell
cd backend
npx prisma studio
```

**5. Backend (Local Engine) — Common workflows**
- Run backend dev (if a dev script exists):

```powershell
cd backend
npm run dev
```

- Ingest a DealMachine CSV (local, heavy files OK):

```powershell
cd backend
# Usage: npx ts-node src/scripts/ingest.ts <path_to_csv> [campaignId]
npx ts-node src/scripts/ingest.ts "..\data\leads_nov_2025.csv" "CAMP_NOV_A"
```

- Create a campaign interactively (TypeScript CLI):

```powershell
cd backend
npx ts-node src/scripts/create-campaign.ts
# or if you added package.json script
npm run script:create-campaign
```

- Launch a blast (interactive confirm):

```powershell
cd backend
npx ts-node src/scripts/blast.ts
# or via package script
npm run script:blast
```

- If you prefer to call the scripts via `ts-node` from repo root, provide correct relative paths; e.g.: 

```powershell
npx ts-node backend/src/scripts/ingest.ts "backend/smoke_test.csv" "SMOKE_TEST_V1"
```

**6. Frontend (Vercel) — Dev and Deploy**
- Start Next.js dev server locally:

```powershell
cd frontend
npm run dev
# or
npx next dev
```

- Build for production locally:

```powershell
cd frontend
npm run build
npm run start
```

- Deploy to Vercel: push to the branch linked to your Vercel project, or use the Vercel CLI:

```powershell
# Install if necessary
npm i -g vercel
# Deploy interactively
cd frontend
vercel
# Or to production
vercel --prod
```

- Webhook endpoint: `POST /api/webhooks/eztexting` on your Vercel URL — configure EzTexting to point here.

**7. Testing & Smoke validation**
- Create a smoke campaign and ingest one CSV row to validate the pipeline:

```powershell
cd backend
# create campaign
npx ts-node src/scripts/create-campaign.ts
# ingest one-row CSV
npx ts-node src/scripts/ingest.ts "backend/smoke_test.csv" "SMOKE_TEST_V1"
```

- Expected output: `✅ ENGINE: Job Complete.` and stats for rowsProcessed, contactsCreated, leadsCreated.

**8. Dependency pins & troubleshooting**
- Prisma is pinned to `5.22.0` in both `backend` and `frontend`. If you see schema validation errors when running `prisma generate`, ensure you're using Prisma v5.22.0 for generation:

```powershell
# Force v5 for a single run
npx prisma@5 generate
```

- If the sync script uses the wrong Prisma version in your environment, run the above in each project, or reinstall the pinned packages:

```powershell
cd backend
npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact
cd ../frontend
npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact
```

**9. Useful troubleshooting commands**
- Show top of README (verify content):

```powershell
Get-Content .\README.md -TotalCount 40
```

- Check remote / compare local and remote heads:

```powershell
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```

- If you accidentally created a commit and want to undo but keep files staged:

```powershell
git reset --soft HEAD~1
```

**10. Recommended sequence for fresh setup**
1. Clone the repo.
2. Create or copy `backend/.env` (direct DB URL) and set Vercel env vars with the pooled DB URL for `frontend`.
3. `cd backend && npm install` then `cd ../frontend && npm install`.
4. From repo root: `npm run db:sync`.
5. Run `npx prisma migrate dev` in `backend` if you need to apply local migrations.
6. Run backend ingestion scripts and test with `npx ts-node src/scripts/ingest.ts`.
7. Start `frontend` locally with `npm run dev` and verify webhooks work (use a tunnel like ngrok for local webhook testing if needed).

**11. Helpful aliases / Windows tips**
- PowerShell quoting: prefer double-quotes for Windows paths that may contain spaces. Example:

```powershell
npx ts-node "backend/src/scripts/ingest.ts" "backend\smoke_test.csv" "SMOKE_TEST_V1"
```

- Long-running local processes: open separate terminals for `backend` and `frontend` dev servers.

---

If you'd like, I can also:
- commit `commandslist.md` and push it to `origin/main` now; or
- expand any section with more examples (e.g., EzTexting webhook payload examples).

Path: `commandslist.md` (root)
