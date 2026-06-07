#!/bin/bash
# Drop build caches and stale Firebase project folders — never ship these to Cloud Run.
set -e

PROJECT="${1:-$(node -e "console.log(JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default)")}"

echo "Stripping deploy artifacts..."

# Webpack/turbopack cache is dev-only; ~600MB+ and useless at runtime.
rm -rf .next/cache

# If a prior deploy copied cache into the functions bundle, remove it there too.
if [ -d ".firebase/${PROJECT}/functions/.next/cache" ]; then
  rm -rf ".firebase/${PROJECT}/functions/.next/cache"
fi

# Drop deploy output from other Firebase projects (keeps incremental uploads for current project).
if [ -d ".firebase" ]; then
  find .firebase -mindepth 1 -maxdepth 1 -type d ! -name "${PROJECT}" -exec rm -rf {} + 2>/dev/null || true
fi

echo "Deploy artifacts stripped for ${PROJECT}."
