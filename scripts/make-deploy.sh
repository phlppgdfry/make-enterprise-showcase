#!/usr/bin/env bash
set -euo pipefail

# Enterprise Deployment Script for Make.com Scenarios
node "$(dirname "$0")/deploy.js"
