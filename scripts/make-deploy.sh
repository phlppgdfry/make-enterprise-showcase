#!/usr/bin/env bash
set -euo pipefail

# Enterprise Deployment Script for Make.com Scenarios
# Uses official @makehq/cli

ZONE="${MAKE_ZONE:-eu1.make.com}"
ORG_ID="${MAKE_ORGANIZATION_ID:-9433554}"
API_KEY="${MAKE_API_KEY:-}"

echo "======================================================"
echo "🚀 Make.com Enterprise Scenario Deployment"
echo "Target Zone:        ${ZONE}"
echo "Target Org ID:      ${ORG_ID}"
echo "======================================================"

if [ -z "$API_KEY" ]; then
  echo "⚠️  MAKE_API_KEY is not set in environment."
  echo "You can set it via: export MAKE_API_KEY='your-token'"
  echo "Or log in interactively using: make-cli login"
fi

# Step 1: Pre-flight validation
echo "--> 1. Running Blueprint Schema & Integrity Validator..."
node "$(dirname "$0")/validate-blueprints.js"

# Step 2: Verify CLI authentication if API Key is provided
if [ -n "$API_KEY" ]; then
  echo "--> 2. Authenticating against Make API..."
  make-cli whoami --zone "$ZONE" --api-key "$API_KEY" || {
    echo "❌ Authentication failed. Check your API key and zone."
    exit 1
  }
fi

echo "--> 3. Scenario manifests ready for deployment:"
find "$(dirname "$0")/../blueprints" -name "scenario-create.json"

echo "======================================================"
echo "✅ Pre-flight checks passed. Run 'make-cli scenarios' to deploy."
echo "======================================================"
