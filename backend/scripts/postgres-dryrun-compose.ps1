# Start a Postgres container via docker-compose, deploy Prisma migrations, then tear down.
# Usage: From repository root (powerShell):
#   .\backend\scripts\postgres-dryrun-compose.ps1

$composeFile = "docker-compose.postgres.yml"
$containerName = "monthaven-postgres-compose"

function Fail($msg) {
    Write-Error $msg
    exit 1
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker CLI not found. Install Docker Desktop and ensure `docker` is on PATH."
}

$info = & docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail "Docker daemon not running. Start Docker Desktop and retry."
}

# Launch Postgres with docker-compose
Write-Host "Launching Postgres via docker-compose..."
& docker compose -f "$composeFile" up -d
if ($LASTEXITCODE -ne 0) { Fail "docker-compose up failed" }

# Wait for health
$max = 60
$wait = 0
while ($true) {
    $status = & docker inspect -f '{{.State.Health.Status}}' $(docker ps -q --filter ancestor=postgres:15) 2>$null
    if ($status -and $status.Trim() -eq 'healthy') { break }
    Start-Sleep -Seconds 1
    $wait++
    if ($wait -ge $max) { Fail "Timed out waiting for Postgres to become healthy" }
}

# Set env and run migrations
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/monthaven?schema=public"
$env:NODE_ENV = 'test'
Push-Location (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent | Split-Path -Parent)
Push-Location backend

Write-Host "Generating Prisma client (Postgres schema)..."
& npx prisma generate --schema=prisma/schema_postgres.prisma
if ($LASTEXITCODE -ne 0) { Pop-Location; Pop-Location; Fail "prisma generate failed" }

Write-Host "Deploying migrations..."
& npx prisma migrate deploy --schema=prisma/schema_postgres.prisma
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    Write-Error "prisma migrate deploy failed (exit $exit). Leaving containers running for debugging."
    Pop-Location; Pop-Location
    exit $exit
}

Write-Host "Migrations applied successfully. Tearing down containers..."
Pop-Location; Pop-Location
& docker compose -f "$composeFile" down

Write-Host "Done."
