# Run from repository root (PowerShell)
Write-Host "Running finish-cleanup.ps1 - archival and removal";

# 1. Archive ops if present
if (Test-Path -Path "ops") {
  Write-Host "Archiving ops -> _archive_legacy/ops";
  Move-Item -Path "ops" -Destination "_archive_legacy/ops" -Force
} else {
  Write-Host "No ops folder present.";
}

# 2. Remove redundant files (only if they exist)
$toRemove = @("commandslist.md", "scripts/db-sync.js", "src/Code.gs")
foreach ($f in $toRemove) {
  if (Test-Path -Path $f) {
    Write-Host "Removing $f";
    Remove-Item -Path $f -Force -Recurse
  } else {
    Write-Host "Not found: $f";
  }
}

# 3. Clean up campaigns inputs
if (Test-Path -Path "campaigns/inputs/sample-commercial.csv") {
  Write-Host "Removing campaigns/inputs/sample-commercial.csv";
  Remove-Item -Path "campaigns/inputs/sample-commercial.csv" -Force
}
if (Test-Path -Path "campaigns/inputs") {
  try { Remove-Item -Path "campaigns/inputs" -Force -Recurse -ErrorAction Stop; Write-Host "Removed campaigns/inputs" } catch { Write-Host "Could not remove campaigns/inputs: $_" }
}
if (Test-Path -Path "campaigns") {
  try { Remove-Item -Path "campaigns" -Force -Recurse -ErrorAction Stop; Write-Host "Removed campaigns" } catch { Write-Host "Could not remove campaigns: $_" }
}

# 4. Move loose root scripts into archive
$rootMoves = @("address-verifier.cjs", "address-verifier-runner.cjs")
foreach ($rm in $rootMoves) {
  if (Test-Path -Path $rm) {
    Write-Host "Archiving $rm -> _archive_legacy/root_scripts/";
    if (!(Test-Path -Path "_archive_legacy/root_scripts")) { New-Item -ItemType Directory -Path "_archive_legacy/root_scripts" | Out-Null }
    Move-Item -Path $rm -Destination "_archive_legacy/root_scripts/" -Force
  }
}

Write-Host "Cleanup complete. Current root listing:";
Get-ChildItem -Force | Select-Object Name
