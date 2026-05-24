# Stealth — GitHub repos in VS Code without `git clone`

[![Open VSX version](https://img.shields.io/open-vsx/v/kingpranav21/stealth?label=Open%20VSX)](https://open-vsx.org/extension/kingpranav21/stealth)
[![Open VSX downloads](https://img.shields.io/badge/dynamic/json?url=https://open-vsx.org/api/kingpranav21/stealth&query=%24.downloadCount&label=downloads&logo=open-vsx&labelColor=555&color=2dd4bf&cacheSeconds=300)](https://open-vsx.org/extension/kingpranav21/stealth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85-0098FF?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)

**Stealth** is a [VS Code](https://code.visualstudio.com/) extension that lets you **open, browse, edit, and save GitHub repositories without a full local clone**. It builds a shallow remote index, hydrates only the files you open, and enforces a disk budget under `~/.stealth/` — built for limited SSD space, many repos, and fast “open and fix” workflows.

Works in **VS Code**, **VSCodium**, and other editors that use the [Open VSX](https://open-vsx.org/) marketplace.

![Stealth extension demo: open a GitHub repo, browse remote files, edit, and push with Cmd+S](./docs/stealth-demo.gif)

## Table of contents

- [Why Stealth](#why-stealth)
- [Install](#install)
- [How to use (after install)](#how-to-use-after-install)
- [Features](#features)
- [Settings](#settings)
- [Stealth vs git clone](#stealth-vs-git-clone)
- [Terminal commands](#terminal-commands)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Why Stealth

| You want to… | Stealth | `git clone` | GitHub Codespace |
|--------------|---------|-------------|------------------|
| Open a repo quickly | ✅ Shallow index | ❌ Full download | ✅ Cloud VM |
| Edit a few files & push | ✅ Cmd+S → GitHub API | ✅ | ✅ |
| Cap disk usage | ✅ Per-workspace + global cache | ❌ Full repo size | ✅ Cloud |
| Run tests / terminal in repo | ❌ | ✅ | ✅ |

Use Stealth when you need **lightweight GitHub editing** on your machine. Use a **clone** or **Codespace** when you need a full dev environment.

## Install

### Open VSX (recommended for VSCodium and VS Code–compatible editors)

1. Open **Extensions** (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search **`Stealth`**
3. Install **[kingpranav21.stealth](https://open-vsx.org/extension/kingpranav21/stealth)**

Or install from the registry page:  
https://open-vsx.org/extension/kingpranav21/stealth

### Build from source

```bash
git clone https://github.com/kingpranav21/stealth.git
cd stealth
npm install
npm run package
```

In the editor: **Cmd+Shift+P** → **Extensions: Install from VSIX…** → select `packages/extension/stealth-*.vsix` → **Reload Window**.

## How to use (after install)

### 1. Reload

**Cmd+Shift+P** → **Developer: Reload Window** after installing.

Use only **one** Stealth install (Open VSX **or** a local VSIX/dev build — not both).

### 2. Sign in

**Cmd+Shift+P** → **`Stealth: Sign in to GitHub`**

### 3. Open a repo

**Cmd+Shift+P** → **`Stealth: Open GitHub Repository…`**

Enter `owner/repo` (e.g. `kingpranav21/stealth`). You need **push access** to save.

### 4. Browse and open files

- Sidebar → **Remote Repository**  
- Or **Stealth: Find File…** (`Cmd+Alt+F`)

Files load from GitHub on first open (hydration). Stubs in Explorer are replaced when you open them.

### 5. Edit and push

Edit → **Cmd+S** / **Ctrl+S** → wait for **“Pushed to GitHub”**.

### 6. Dashboard

Click **Stealth** in the **status bar** (bottom-right) or run **`Stealth: Stealth Dashboard`**.

### Command cheat sheet

| Action | Command palette |
|--------|-----------------|
| Open repo | `Stealth: Open GitHub Repository…` |
| Find file | `Stealth: Find File…` |
| Reload file from GitHub | `Stealth: Hydrate Active File from GitHub` |
| All commands | `Stealth: Stealth Menu…` |
| Disk / cache | `Stealth: Cache Actions…` or Dashboard |

Full walkthrough (same as Open VSX listing): [packages/extension/README.md](./packages/extension/README.md)

## Terminal (Stealth CLI)

Push to GitHub from the shell — same workspaces as the editor (`~/.stealth/workspaces/`).

**Auth** (once per machine):

```bash
export GITHUB_TOKEN=$(gh auth token)   # or set GITHUB_TOKEN / STEALTH_GITHUB_TOKEN
npm run build
npm run stealth -- auth
```

**From a Stealth workspace folder** (open the repo in the editor first, or `cd` into its workspace):

```bash
cd ~/.stealth/workspaces/<workspace-id>

# Pipe content → create/update on GitHub
echo '# Deploy notes' | npm run stealth -- write docs/deploy.md -m "Add deploy notes"

# Push files already on disk
npm run stealth -- push src/config.ts package.json

# Create empty file on GitHub
npm run stealth -- touch scripts/run.sh -m "Add run script"

# Read remote file
npm run stealth -- cat README.md

# List workspaces
npm run stealth -- workspaces
```

Install globally after build: `npm link` (optional), then run `stealth` directly.

| CLI command | Saves to GitHub? | Saves locally under `~/.stealth`? |
|-------------|------------------|----------------------------------|
| `stealth write <path>` | Yes | Yes |
| `stealth push <file…>` | Yes | Uses existing file |
| `stealth touch <path>` | Yes (empty file) | Yes |
| `stealth cat <path>` | No (read only) | No |

## Features

- **No local `.git`** — remote workspace backed by GitHub APIs
- **Shallow / lazy index** — fast open; deep index optional
- **On-demand hydration** — only opened files use cache disk
- **Stub Guard** — warns if the editor shows stub placeholders instead of real code (helps AI-assisted editing)
- **Disk Governor** — optional Mac-wide cap across all `~/.stealth` workspaces
- **Stealth Dashboard** — disk usage, API quota, workspace actions
- **Find file**, branch switch, compare/pull from remote, open PR in browser, Codespace link

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `stealth.cacheMaxMb` | `500` | Max hydrated bytes per workspace |
| `stealth.globalCacheMaxMb` | `0` | Mac-wide cap under `~/.stealth` (`0` = off) |
| `stealth.indexMode` | `shallow` | `shallow` or `full` tree when opening a repo |
| `stealth.stubGuard` | `true` | Warn when stub content is in the editor |
| `stealth.bloatBlocklist` | on | Block hydrating huge paths (`node_modules`, etc.) |
| `stealth.checkRemoteBeforeSave` | `true` | Warn if the file changed on GitHub before save |

Local data: `~/.stealth/indexes/` and `~/.stealth/workspaces/`.

## Stealth vs git clone

**Stealth** is a **GitHub remote workspace extension**: browse and edit like a normal project, but without cloning the full history and tree to disk.

**Choose Stealth** for quick edits, small SSDs, or juggling many repositories.  
**Choose `git clone`** for local builds, tests, and git CLI workflows.  
**Choose Codespaces** for a full cloud dev box.

## Terminal commands

Run from the repo root after `git clone` and `npm install`:

| Command | What it does |
|---------|----------------|
| `npm test` | Unit tests + extension build (CI-safe, ~30s) |
| `npm run test:unit` | Unit tests only (shared logic + manifest) |
| `npm run build` | Compile shared + extension + CLI |
| `npm run stealth -- <cmd>` | Stealth CLI (`push`, `write`, `touch`, `cat`) |
| `npm run smoke` | Full pipeline: build, package VSIX, manifest checks |
| `npm run package` | Build and create `packages/extension/stealth-*.vsix` |
| `npm run demo-gif` | Regenerate `docs/stealth-demo.gif` (needs Playwright) |

Example — clone, test, package:

```bash
git clone https://github.com/kingpranav21/stealth.git
cd stealth
npm install
npm test
npm run package
```

Requires **Node.js 18+** (20+ recommended). Tests use the built-in `node:test` runner — no extra test framework.

## Development

```bash
npm install
npm test
```

Press **F5** → **Run Stealth Extension** (Extension Development Host) for manual testing in the editor.

Optional: `STEALTH_SMOKE=1 npm test` then `npm run smoke` for a release VSIX check.

## Contributing

Bug reports and PRs are welcome: [github.com/kingpranav21/stealth/issues](https://github.com/kingpranav21/stealth/issues)

## License

[MIT](LICENSE) © contributors
