#!/bin/bash

# WoodBine Firebase Hosting deploy — Turbopack builds + incremental uploads.

set -e

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
PURPLE="\033[35m"
RESET="\033[0m"

cleanup() {
  node scripts/restore-next-bin.mjs 2>/dev/null || true
}
trap cleanup EXIT

echo -e "${BLUE}${BOLD}Starting WoodBine deploy...${RESET}\n"

echo -e "${PURPLE}Cleaning local clutter (keeping .firebase for incremental upload)...${RESET}"
find . -name ".DS_Store" -type f -delete
find . -name "Thumbs.db" -type f -delete
echo -e "${GREEN}✓ Ready.${RESET}"

echo -e "${BLUE}Patching Next.js CLI for Turbopack production build...${RESET}"
node scripts/patch-next-for-turbopack.mjs

echo -e "${BLUE}Deploying to Firebase Hosting (Turbopack build — ~30-40s, continuous output)...${RESET}"
export FIREBASE_DEPLOY=1
export NEXT_TELEMETRY_DISABLED=1
firebase deploy --only hosting --force

echo -e "${BLUE}Cleaning local deploy artifacts...${RESET}"
./scripts/strip-deploy-artifacts.sh
echo -e "${GREEN}✓ Local artifacts cleaned.${RESET}"

echo -e "${BLUE}Ensuring SSR runtime settings...${RESET}"
./scripts/ensure-ssr-public-access.sh
./scripts/ensure-ssr-memory.sh
./scripts/ensure-ssr-scaling.sh
echo -e "${GREEN}✓ SSR runtime verified.${RESET}"

echo -e "\n${GREEN}${BOLD}Deploy complete!${RESET}\n"
