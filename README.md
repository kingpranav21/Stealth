# Stealth

Open a GitHub repo in Cursor **without `git clone`**. Stealth keeps a small index on disk; only files you open (hydrate) count toward a **cache cap** you control.

![Stealth demo](./docs/stealth-demo.gif)

**Use when:** small SSD, many repos, quick edits. **Use Codespace instead when:** you need `npm test`, terminal, or full PR review.

**Unique to Stealth:** [Stub Guard + Disk Governor + bloat blocklist](./UNIQUE.md) — problems clone/GitHub never had to solve.

## Install

### From VSIX (beta)

```bash
git clone https://github.com/pranavahuja/stealth.git
cd stealth
npm install
npm run package
```

In Cursor: **Cmd+Shift+P** → **Extensions: Install from VSIX…** →  
`packages/extension/stealth-0.10.1.vsix` → **Reload Window**.

### From Open VSX

**Extensions** → search **Stealth** → Install, or:

[Install from Open VSX](https://open-vsx.org/extension/kingpranav21/stealth)

First-time publish: [PUBLISHING.md](./PUBLISHING.md) (`OPEN_VSX_TOKEN` + `./scripts/publish-openvsx.sh`).

## Quick start

1. **Stealth: Sign in to GitHub**
2. **Stealth: Open GitHub Repository…** → `yourname/your-repo` (repo you can **push** to)
3. **Remote Repository** (sidebar) — expand folders, open files
4. Edit → **Cmd+S** → pushed to GitHub
5. Bottom-right status bar — click **Stealth Dashboard** (cache, global disk, API quota, Stub Guard)

## Stealth vs clone vs Codespace

| | `git clone` | Stealth | Codespace |
|--|-------------|---------|-----------|
| Disk | Full repo | Capped cache | Cloud |
| Terminal / tests | Yes | No | Yes |
| Open time | Slow | Fast | Medium |

Details: [COMPARISON.md](./COMPARISON.md).

## Main commands

| Command | What it does |
|---------|----------------|
| Open GitHub Repository… | Shallow index + workspace under `~/.stealth/` |
| Find File… (`Cmd+Alt+F`) | Search paths (GitHub code search or local index) |
| Stealth Dashboard | One panel: disk, API, stubs, actions |
| Stealth Menu… | Quick-pick for all commands |
| Switch Stealth Workspace… | Reopen `~/.stealth/workspaces` |
| Deep Index | Full recursive file list |
| Compare / Pull from GitHub | Diff or reset vs remote |
| Create Pull Request… | GitHub compare → open PR in browser |
| Open in Codespace… | Full dev environment |
| Cache Actions… | Usage, evict, API quota, pin workspace |

Full list: [ROADMAP.md](./ROADMAP.md) · [CHANGELOG.md](./CHANGELOG.md).

## Cache & settings

| Setting | Default | Description |
|---------|---------|-------------|
| `stealth.cacheMaxMb` | 500 | Max hydrated file bytes |
| `stealth.indexMode` | shallow | `shallow` or `full` tree on open |
| `stealth.pinnedPaths` | [] | Files never evicted |
| `stealth.rateLimitWarnAt` | 100 | Warn when API quota is low |
| `stealth.checkRemoteBeforeSave` | true | Warn if GitHub changed file before save |

Data: `~/.stealth/indexes/` and `~/.stealth/workspaces/`.

## Development

```bash
npm install
npm run build
```

**F5** → **Run Stealth Extension** (Extension Development Host).  
Test in that window, not only the repo you’re editing.

## Ship & demo

- Dogfood checklist: [SHIP.md](./SHIP.md)
- GIF script: [DEMO.md](./DEMO.md)
- Publish: [PUBLISHING.md](./PUBLISHING.md)

## Version

Latest: **0.10.1** — Dashboard, icon, Open VSX publish scripts, demo GIF.  
See [CHANGELOG.md](./CHANGELOG.md).
