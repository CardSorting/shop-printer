#!/bin/bash
# Next.js SSR on Firebase defaults to 256Mi — too small and causes intermittent 500s.
set -e

PROJECT="${1:-$(node -e "console.log(JSON.parse(require('fs').readFileSync('.firebaserc','utf8')).projects.default)")}"
REGION="${FIREBASE_SSR_REGION:-us-central1}"
SERVICE="ssr${PROJECT//-/}"
MEMORY="${FIREBASE_SSR_MEMORY:-2Gi}"
CPU="${FIREBASE_SSR_CPU:-2}"

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

CURRENT_MEM=$(echo "$SERVICE_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);console.log(j.template?.containers?.[0]?.resources?.limits?.memory||'')})")
CURRENT_CPU=$(echo "$SERVICE_JSON" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);console.log(j.template?.containers?.[0]?.resources?.limits?.cpu||'')})")

if [ "$CURRENT_MEM" = "$MEMORY" ] && [ "$CURRENT_CPU" = "$CPU" ]; then
  echo "SSR resources already ${MEMORY} / ${CPU} vCPU for ${SERVICE}."
  exit 0
fi

PATCH=$(echo "$SERVICE_JSON" | node -e "
let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{
  const svc=JSON.parse(s);
  if(svc.error){console.error(svc.error.message);process.exit(1)}
  const c=svc.template.containers[0];
  c.resources=c.resources||{limits:{}};
  c.resources.limits.memory='${MEMORY}';
  c.resources.limits.cpu='${CPU}';
  console.log(JSON.stringify({template:{containers:[c],scaling:svc.template.scaling,serviceAccount:svc.template.serviceAccount}}));
})")

RESPONSE=$(curl -s -X PATCH \
  "https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/services/${SERVICE}?updateMask=template" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$PATCH")

if echo "$RESPONSE" | grep -q '"error"'; then
  echo "Warning: could not set SSR memory on ${SERVICE}: $(echo "$RESPONSE" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).error.message)}catch{console.log(s)}})")"
  exit 0
fi

echo "SSR resources set to ${MEMORY} / ${CPU} vCPU for ${SERVICE} (was ${CURRENT_MEM:-unknown} / ${CURRENT_CPU:-unknown})."
