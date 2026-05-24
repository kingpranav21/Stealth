#!/usr/bin/env bash
# Terminal-friendly test runner (unit + extension build).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

step() { printf "${CYAN}→ %s${RESET}\n" "$*"; }
ok() { printf "${GREEN}✓ %s${RESET}\n" "$*"; }
fail() { printf "${RED}✗ %s${RESET}\n" "$*" >&2; exit 1; }

echo ""
echo "Stealth test"
echo "============"

step "install dependencies"
npm install --silent

step "build @stealth/shared"
npm run build --workspace @stealth/shared

step "build extension"
npm run build --workspace stealth
ok "extension build"

step "build CLI"
npm run build --workspace @stealth/cli
ok "CLI"

step "unit tests"
if ! node --test --test-reporter spec test/unit/*.test.mjs; then
  fail "unit tests"
fi
ok "unit tests"

if [[ "${STEALTH_SMOKE:-}" == "1" ]]; then
  step "smoke (build + VSIX)"
  bash scripts/smoke-check.sh
  ok "smoke"
fi

echo ""
ok "all tests passed"
echo ""
