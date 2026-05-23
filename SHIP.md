# Stealth — Ship checklist (alpha)

## Automated (run before manual dogfood)

```bash
npm run smoke          # build + package + command checks
npm run dogfood        # smoke + demo GIF + bundle checks
```

Generate / refresh demo GIF:

```bash
python3 -m venv .venv-gif && .venv-gif/bin/pip install pillow
.venv-gif/bin/python scripts/generate-demo-gif.py
```

## 1. Build & install locally

```bash
npm install && npm run package
```

Install **`packages/extension/stealth-0.10.1.vsix`** (or latest from `package.json` version) via **Extensions: Install from VSIX…** → reload.

## 2. Dogfood (manual — three repos)

| Repo | Why |
|------|-----|
| Small (yours, &lt; 100 files) | Save, branch, find file |
| Medium (500+ files) | Shallow index + lazy tree |
| Large or monorepo | Deep index optional; eviction |

Per repo:

- [ ] Sign in → Open GitHub Repository
- [ ] Bottom-right status + **Stealth Dashboard**
- [ ] Open file → edit → Cmd+S → verify on github.com
- [ ] Find File (Cmd+Alt+F)
- [ ] Cache evict + pin workspace + Disk Governor
- [ ] Switch branch / Switch Stealth Workspace
- [ ] Compare with GitHub / Stub Guard on evicted file
- [ ] Create PR + Codespace link

Record notes in [DOGFOOD.md](./DOGFOOD.md).

## 3. Open VSX publish

Prerequisites:

- [x] `publisher`: `kingpranav21` in `package.json`
- [x] `repository.url` set
- [x] `icon.png` (128×128)
- [x] `docs/stealth-demo.gif` in README
- [x] Open VSX account **kingpranav21**
- [ ] Sign [Publisher Agreement](https://open-vsx.org) (required before first publish)
- [ ] Create token → [user settings](https://open-vsx.org/user-settings/tokens)

Publish:

```bash
export OPEN_VSX_TOKEN=your_token
./scripts/publish-openvsx.sh
# or: git tag v0.10.1 && git push origin v0.10.1  (GitHub Action)
```

## 4. After publish

- [ ] Install from [Open VSX](https://open-vsx.org/extension/kingpranav21/stealth) in a clean Cursor profile
- [x] README links to Open VSX
