# PROPRIETARY — Always Improving LLC
# Copyright © 2025. All Rights Reserved.
# No license granted. Access under Shareholders' Agreement §8.3.

#!/usr/bin/env bash
set -euo pipefail

echo "Running finish-cleanup.sh - archival and removal"

# 1. Archive ops if present
if [ -d "ops" ]; then
  echo "Archiving ops -> _archive_legacy/ops"
  mkdir -p _archive_legacy
  mv ops _archive_legacy/
else
  echo "No ops folder present."
fi

# 2. Remove redundant files
for f in commandslist.md scripts/db-sync.js src/Code.gs; do
  if [ -e "$f" ]; then
    echo "Removing $f"
    rm -rf "$f"
  else
    echo "Not found: $f"
  fi
done

# 3. Clean up campaigns inputs
if [ -e "campaigns/inputs/sample-commercial.csv" ]; then
  echo "Removing campaigns/inputs/sample-commercial.csv"
  rm -f campaigns/inputs/sample-commercial.csv
fi
if [ -d "campaigns/inputs" ]; then
  rmdir --ignore-fail-on-non-empty campaigns/inputs || rm -rf campaigns/inputs || true
fi
if [ -d "campaigns" ]; then
  rmdir --ignore-fail-on-non-empty campaigns || rm -rf campaigns || true
fi

# 4. Move loose root scripts into archive
mkdir -p _archive_legacy/root_scripts
for rmf in address-verifier.cjs address-verifier-runner.cjs *.csv; do
  shopt -s nullglob
  for f in $rmf; do
    if [ -e "$f" ]; then
      echo "Archiving $f -> _archive_legacy/root_scripts/"
      mv "$f" _archive_legacy/root_scripts/
    fi
  done
  shopt -u nullglob
done

echo "Cleanup complete. Current root listing:"
ls -F
