# Dogfood — automated report

**Version:** 0.10.1  
**Date:** 2026-05-24  

## Automated checks (all passed)

| Check | Status |
|-------|--------|
| `npm run build` | ✓ |
| `npm run package` → `stealth-0.10.1.vsix` | ✓ |
| Marketplace icon | ✓ |
| Core commands registered | ✓ |
| `docs/stealth-demo.gif` | ✓ |
| Stub Guard in bundle | ✓ |

## Demo GIF

Generated slideshow at [docs/stealth-demo.gif](./docs/stealth-demo.gif) (also in README).

Regenerate: `npm run demo-gif`

## Manual dogfood (you)

Use [DOGFOOD.md](./DOGFOOD.md) while testing three repos per [SHIP.md](./SHIP.md).

## Open VSX

Publish requires your token (not run in CI here):

```bash
export OPEN_VSX_TOKEN=your_token
./scripts/publish-openvsx.sh
```

Extension URL (after publish): https://open-vsx.org/extension/kingpranav21/stealth
