# MAE Command Center (Frontend)

The visual interface for the Monthaven Acquisition Engine (MAE).

## 1. Setup & Install
```powershell
# From `frontend/`
npm install
npx prisma generate
```

## 2. Local Development
```powershell
# Start Next.js dev server
npm run dev
# Runs on http://localhost:3000
```

The app connects to the database defined in `frontend/.env`.

## 3. Deployment (Vercel)
This project is optimized for Vercel.

1. Push the `frontend/` folder (or monorepo root) to GitHub.
2. Import the project in Vercel.
   - If prompted, set the Root Directory to `frontend`.
3. Environment Variables in Vercel:
   - `DATABASE_URL` — MUST use the Neon Pooled URL (e.g. `...-pooler.us-east-2...&pgbouncer=true`).
   - `NEXT_PUBLIC_API_URL` — Optional, if you have external APIs.
4. Build & Install commands: use Vercel defaults (`npm install`, `next build`).

Important: Run `npm run db:sync` from the repo root locally after any schema changes so `frontend/prisma/schema.prisma` is up to date before deploying.
