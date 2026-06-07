#!/bin/bash
# Grant public invoker on the Next.js SSR Cloud Run service (new Firebase projects often miss this).
set -e

PROJECT="${1:-$(node -e "console.log(JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default)")}"
REGION="${FIREBASE_SSR_REGION:-us-central1}"
SERVICE="ssr${PROJECT//-/}"

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

RESPONSE=$(curl -s -X POST \
  "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}:setIamPolicy" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"policy":{"bindings":[{"role":"roles/run.invoker","members":["allUsers"]}]}}')

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "Warning: could not set public SSR access on ${SERVICE}: $(echo "$RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).error.message)}catch{console.log(s)}})")"
  exit 0
fi

echo "Public SSR access ensured for ${SERVICE} (${PROJECT})."
