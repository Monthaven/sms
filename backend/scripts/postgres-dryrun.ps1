# Postgres dry-run helper for local testing
# Usage: Open PowerShell as administrator (if needed) and run:
#   .\postgres-dryrun.ps1
# This script will:
# - Stop and remove any existing container named `monthaven-test-postgres`
# - Start a new Postgres container on port 5432
# - Wait for Postgres to accept connections
# - Run `npx prisma migrate deploy` against the container's DB
# - Tear down the container on completion (unless you comment out cleanup)

$containerName = 'monthaven-test-postgres'
$pgPassword = 'postgres'
$pgDb = 'monthaven'
$pgPort = 5432

function Cleanup {
    Write-Host "Stopping and removing container $containerName..."
    # Call docker as an external program and ignore errors
    & docker rm -f $containerName 2>$null | Out-Null
}

# Ensure Docker is available and the daemon is running
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker CLI not found. Please install Docker Desktop and ensure `docker` is on PATH."
    exit 1
}

$dockerInfo = & docker info 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon does not appear to be running. Start Docker Desktop (or the Docker service) and retry."
    exit 1
}

# Remove any existing container
Cleanup

# Start Postgres container
Write-Host "Starting Postgres container ($containerName)..."
# Use the call operator (&) to avoid PowerShell treating arguments as cmdlet parameters
& docker run --name $containerName -e "POSTGRES_PASSWORD=$pgPassword" -e "POSTGRES_DB=$pgDb" -p "$($pgPort):5432" -d postgres:15 > $null 2>&1

# Wait for Postgres to accept connections
Write-Host "Waiting for Postgres to be ready on localhost:$pgPort..."
$maxWait = 60
$elapsed = 0
while ($true) {
    try {
        # Try to open a TCP connection to Postgres
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect('127.0.0.1', $pgPort, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(1000)
        if ($success -and $tcp.Connected) {
            $tcp.Close()
            break
        }
        $tcp.Close()
    } catch {
        # ignore
    }
    Start-Sleep -Seconds 1
    $elapsed++
    if ($elapsed -ge $maxWait) {
        Write-Error "Timed out waiting for Postgres to start."
        exit 1
    }
}

Write-Host "Postgres appears ready. Running Prisma migrate deploy against the container..."

# Build the DATABASE_URL
$env:DATABASE_URL = "postgresql://postgres:$pgPassword@127.0.0.1:$pgPort/$pgDb?schema=public"
$env:NODE_ENV = 'test'

Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent | Split-Path -Parent)
# Move to backend folder and run prisma generate then deploy
Push-Location backend

Write-Host "Generating Prisma client (Postgres schema)..."
npx prisma generate --schema=prisma/schema_postgres.prisma

Write-Host "Deploying migrations (Postgres schema)..."
# Use migrate deploy to apply existing migrations (safe for CI/dry-run)
npx prisma migrate deploy --schema=prisma/schema_postgres.prisma

$deployExit = $LASTEXITCODE
if ($deployExit -ne 0) {
    Write-Error "Prisma migrate deploy failed with exit code $deployExit"
    Pop-Location
    Pop-Location
    # leave the container running for debugging
    exit $deployExit
}

Write-Host "Migrations applied successfully. You can inspect DB with: npx prisma studio --schema=prisma/schema.prisma"

Pop-Location
Pop-Location

# Cleanup: stop & remove the container
Cleanup

Write-Host "Postgres dry-run complete. Container removed."