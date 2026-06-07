#!/bin/bash

# WoodBine Managed Development Server
# This script ensures ports are cleaned before start AND on exit.

PORT=3000

cleanup() {
  echo ""
  ./scripts/cleanup-ports.sh
}

# Trap Ctrl+C (SIGINT) and SIGTERM
trap cleanup SIGINT SIGTERM EXIT

echo "🌿 [WoodBine] Starting managed dev server..."
./scripts/cleanup-ports.sh

export NEXT_TELEMETRY_DISABLED=1

# Run next dev (Turbopack for faster first-compile on page visits)
npx next dev --turbo
