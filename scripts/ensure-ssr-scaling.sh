#!/bin/bash
# Keep one SSR instance warm so first page load is not a cold start (~5-10s).
set -e

PROJECT="${1:-$(node -e "console.log(JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default)")}"
REGION="${FIREBASE_SSR_REGION:-us-central1}"
SERVICE="ssr${PROJECT//-/}"
MIN_INSTANCES="${FIREBASE_SSR_MIN_INSTANCES:-1}"
MAX_INSTANCES="${FIREBASE_SSR_MAX_INSTANCES:-3}"

TOKEN=$(node -e "
const fs = require('fs');
const paths = [
  process.env.HOME + '/.config/configstore/firebase-tools.json',
  process.env.HOME + '/Library/Preferences/firebase-tools/firebase-tools.json',
];
for (const p of paths) {
  if (fs.existsSync(p)) {
    const token = JSON.parse(fs.readFileSync(p, 'utf8')).tokens?.access_token;
    if (token) { console.log(token); process.exit(0); }
  }
}
process.exit(1);
")

SERVICE_JSON=$(curl -s \
  "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}" \
  -H "Authorization: Bearer ${TOKEN}")

CURRENT=$(echo "$SERVICE_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);console.log(j.scaling?.minInstanceCount??0)})")

if [ "$CURRENT" = "$MIN_INSTANCES" ]; then
  echo "SSR min instances already ${MIN_INSTANCES} for ${SERVICE}."
  exit 0
fi

RESPONSE=$(curl -s -X PATCH \
  "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}?updateMask=scaling" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"scaling\":{\"minInstanceCount\":${MIN_INSTANCES},\"maxInstanceCount\":${MAX_INSTANCES}}}")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "Warning: could not set SSR min instances on ${SERVICE}: $(echo "$RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).error.message)}catch{console.log(s)}})")"
  exit 0
fi

echo "SSR min instances set to ${MIN_INSTANCES} for ${SERVICE} (was ${CURRENT})."
