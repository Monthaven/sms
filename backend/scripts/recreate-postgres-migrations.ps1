Param()
Set-StrictMode -Version Latest

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here "..")
$prismaDir = Join-Path $root 'prisma'
$migrationsDir = Join-Path $prismaDir 'migrations'
$timestamp = Get-Date -Format yyyyMMddHHmmss
$backupDir = Join-Path $prismaDir "migrations_sqlite_backup_$timestamp"

Write-Output "This script moves existing Prisma migrations (likely sqlite) to a backup folder"
Write-Output "and reminds you to generate a new Postgres migration history using 'prisma migrate dev'."

if (-Not (Test-Path $prismaDir)) {
  Write-Error "Cannot find prisma dir at $prismaDir"
  exit 1
}

if (Test-Path $migrationsDir) {
  Write-Output "Moving $migrationsDir -> $backupDir"
  Move-Item -Path $migrationsDir -Destination $backupDir
  Write-Output "Moved. Please review the backup at: $backupDir"
} else {
  Write-Output "No migrations directory found at $migrationsDir — nothing to move"
}

@"
Next steps (local):
1) Create a new branch for this work, e.g.:
     git checkout -b chore/reinit-postgres-migrations

2) Commit the backup change (this script only moved files locally):
     git add -A
     git commit -m "chore: move sqlite prisma migrations to backup"

3) Generate a new Postgres migration history against a local Postgres DB:
     # set DIRECT_URL or DATABASE_URL to a Postgres instance (docker-compose or local)
     $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/monthaven"
     npx prisma migrate dev --schema=prisma/schema_postgres.prisma --name init_postgres

4) Inspect `prisma/migrations` and commit the new Postgres migrations, then push and open a PR.

Important: This rewrites migration history. Do NOT apply to production databases without backups and coordination.
"@

Write-Output "Script complete."
