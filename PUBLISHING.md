# Publishing Stealth to Open VSX

Open VSX is the extension marketplace used by **Cursor**, **VSCodium**, and other VS Code–compatible editors.

## Before you publish

1. **Create your namespace once** (must match `publisher` in `package.json`):
   ```bash
   export OPEN_VSX_TOKEN=your_token
   npx ovsx create-namespace kingpranav21 -p "$OPEN_VSX_TOKEN"
   ```
   If publish fails with `Unknown publisher`, run the command above, then re-run `./scripts/publish-openvsx.sh`.
2. `publisher` is **`kingpranav21`** in `package.json` (must match your Open VSX login).
3. Set `repository.url` to your real GitHub repo (already points at `pranavahuja/stealth` — change if you fork).
4. Icon: `packages/extension/icon.png` (128×128 PNG, included in repo).
5. Complete [SHIP.md](./SHIP.md) dogfood checklist.
6. Record a demo GIF ([DEMO.md](./DEMO.md)) and add to README.

## Build the VSIX

```bash
cd /path/to/Stealth
npm install
npm run package
```

Output: `packages/extension/stealth-<version>.vsix` (from `package.json`).

Test locally: **Extensions: Install from VSIX…** → reload.

## Manual publish (recommended)

```bash
export OPEN_VSX_TOKEN=your_token_here
./scripts/publish-openvsx.sh
```

Or step by step:

1. Token: [open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens) (publish scope).
2. `npm run package`
3. `npx ovsx create-namespace kingpranav21 -p "$OPEN_VSX_TOKEN"` (first time only)
4. `npx ovsx publish packages/extension/stealth-0.10.1.vsix -p "$OPEN_VSX_TOKEN"`

Extension page: https://open-vsx.org/extension/kingpranav21/stealth

Read [OPEN_VSX_PUBLISHER.md](./OPEN_VSX_PUBLISHER.md) for the Eclipse Publisher Agreement (signing required).

## GitHub Actions

1. Repo secret: **`OPEN_VSX_TOKEN`**
2. Push tag: `git tag v0.10.1 && git push origin v0.10.1`  
   Or **Actions** → **Publish to Open VSX** → **Run workflow**
3. Workflow: `.github/workflows/publish-openvsx.yml`

## After publish

- Install from Extensions → search **Stealth**
- Add Open VSX badge/link to README if desired

## Microsoft Marketplace

Stealth targets **Open VSX / Cursor** first. The Microsoft Visual Studio Marketplace needs a separate publisher account and `vsce publish` — optional later.
