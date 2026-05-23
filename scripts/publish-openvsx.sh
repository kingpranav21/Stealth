#!/usr/bin/env bash
# Publish latest VSIX to Open VSX. Requires OPEN_VSX_TOKEN in env.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${OPEN_VSX_TOKEN:-}" ]]; then
  echo "ERROR: Set OPEN_VSX_TOKEN (https://open-vsx.org/user-settings/tokens)"
  exit 1
fi

VERSION="$(node -p "require('./packages/extension/package.json').version")"
echo "→ Building stealth@${VERSION}"
npm run package

VSIX="$ROOT/packages/extension/stealth-${VERSION}.vsix"
if [[ ! -f "$VSIX" ]]; then
  echo "ERROR: Missing $VSIX"
  exit 1
fi

PUBLISHER="$(node -p "require('./packages/extension/package.json').publisher")"

echo "→ Ensuring namespace ${PUBLISHER} exists (one-time; safe to re-run)"
if ! npx --yes ovsx verify-pat "$PUBLISHER" -p "$OPEN_VSX_TOKEN" >/dev/null 2>&1; then
  npx --yes ovsx create-namespace "$PUBLISHER" -p "$OPEN_VSX_TOKEN"
fi

echo "→ Publishing $VSIX to https://open-vsx.org"
npx --yes ovsx publish "$VSIX" -p "$OPEN_VSX_TOKEN"

echo "Done. Extension: https://open-vsx.org/extension/${PUBLISHER}/stealth"
