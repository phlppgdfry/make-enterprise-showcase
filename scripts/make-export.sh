#!/usr/bin/env bash
set -euo pipefail

# Make Scenario Exporter
# Exports remote Make.com scenarios to local version-controlled JSON

ZONE="${MAKE_ZONE:-eu1.make.com}"
TEAM_ID="${MAKE_TEAM_ID:-}"
OUTPUT_DIR="${1:-./exports}"

if [ -z "$TEAM_ID" ]; then
  echo "Usage: MAKE_TEAM_ID=<team_id> ./make-export.sh [output_dir]"
  echo "Example: MAKE_TEAM_ID=12345 ./make-export.sh ./exports"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
echo "Fetching scenarios for Team ${TEAM_ID} from ${ZONE}..."

make-cli scenarios list --team-id "$TEAM_ID" --zone "$ZONE" --output json > "${OUTPUT_DIR}/scenarios-index.json"
echo "Saved index to ${OUTPUT_DIR}/scenarios-index.json"
