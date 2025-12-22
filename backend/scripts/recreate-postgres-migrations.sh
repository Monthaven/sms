# PROPRIETARY — Always Improving LLC
# Copyright © 2025. All Rights Reserved.
# No license granted. Access under Shareholders' Agreement §8.3.

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRISMA_DIR="$ROOT/prisma"
MIGRATIONS_DIR="$PRISMA_DIR/migrations"
BACKUP_DIR="$PRISMA_DIR/migrations_sqlite_backup_$(date +%Y%m%d%H%M%S)"

echo "This script moves existing Prisma migrations (likely sqlite) to a backup folder"
echo "and reminds you to generate a new Postgres migration history using 'prisma migrate dev'."

if [ ! -d "$PRISMA_DIR" ]; then
  echo "Cannot find prisma dir at $PRISMA_DIR" >&2
  exit 1
fi

if [ -d "$MIGRATIONS_DIR" ]; then
  echo "Moving $MIGRATIONS_DIR -> $BACKUP_DIR"
  mv "$MIGRATIONS_DIR" "$BACKUP_DIR"
  echo "Moved. Please review the backup at: $BACKUP_DIR"
else
  echo "No migrations directory found at $MIGRATIONS_DIR — nothing to move"
fi

cat <<'EOF'
Next steps (local):
1) Create a new branch for this work, e.g.:
     git checkout -b chore/reinit-postgres-migrations

2) Commit the backup change (this script only moved files locally):
     git add -A
     git commit -m "chore: move sqlite prisma migrations to backup"

3) Generate a new Postgres migration history against a local Postgres DB:
     # set DIRECT_URL or DATABASE_URL to a Postgres instance (docker-compose or local)
     export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/monthaven"
     npx prisma migrate dev --schema=prisma/schema_postgres.prisma --name init_postgres

4) Inspect `prisma/migrations` and commit the new Postgres migrations, then push and open a PR.

Important: This rewrites migration history. Do NOT apply to production databases without backups and coordination.
EOF

echo "Script complete."
