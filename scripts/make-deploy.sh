#!/usr/bin/env bash
set -euo pipefail

# Offline plan by default; forward explicit selection/apply arguments.
exec node "$(dirname "$0")/deploy.js" "$@"
