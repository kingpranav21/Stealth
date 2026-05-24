#!/usr/bin/env bash
# Quick sanity checks before shipping a VSIX.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ npm install"
npm install --silent

echo "→ build"
npm run build

echo "→ package"
npm run package

VSIX="$(ls -t packages/extension/stealth-*.vsix 2>/dev/null | head -1)"
if [[ -z "$VSIX" ]]; then
  echo "FAIL: no VSIX produced"
  exit 1
fi

echo "→ VSIX: $VSIX ($(du -h "$VSIX" | cut -f1))"

node -e "
const pkg = require('./packages/extension/package.json');
const required = ['stealth.openRepository', 'stealth.dashboard', 'stealth.diskGovernor'];
for (const c of required) {
  if (!pkg.contributes.commands.some(x => x.command === c)) {
    console.error('Missing command:', c);
    process.exit(1);
  }
}
console.log('→ package.json commands OK (v' + pkg.version + ')');
"

echo "OK — run: npm test (unit) · install VSIX in Extension Development Host for manual QA"
