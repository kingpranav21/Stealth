# Stealth — GitHub repos in VS Code & Cursor without `git clone`

[![Open VSX](https://img.shields.io/open-vsx/v/kingpranav21/stealth?label=Open%20VSX)](https://open-vsx.org/extension/kingpranav21/stealth)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.85-0098FF?logo=visualstudiocode&logoColor=white)](https://code.visualstudio.com/)

**Stealth** is a [VS Code](https://code.visualstudio.com/) / [Cursor](https://cursor.com/) extension that lets you **open, browse, edit, and save GitHub repositories without a full local clone**. It builds a shallow remote index, hydrates only the files you open, and enforces a disk budget under `~/.stealth/` — built for limited SSD space, many repos, and fast “open and fix” workflows.

Works in **Cursor**, **VS Code**, **VSCodium**, and other editors that use the [Open VSX](https://open-vsx.org/) marketplace.

![Stealth extension demo: open a GitHub repo, browse remote files, edit, and push with Cmd+S](./docs/stealth-demo.gif)

## Table of contents

- [Why Stealth](#why-stealth)
- [Install](#install)
- [Quick start](#quick-start)
- [Features](#features)
- [Settings](#settings)
- [Stealth vs git clone](#stealth-vs-git-clone)
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

### Open VSX (recommended for Cursor & VSCodium)

1. Open **Extensions** (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search **`Stealth`**
3. Install **[kingpranav21.stealth](https://open-vsx.org/extension/kingpranav21/stealth)**

Or install from the registry page:  
https://open-vsx.org/extension/kingpranav21/stealth

### Build from source

```bash
git clone https://github.com/pranavahuja/stealth.git
cd stealth
npm install
npm run package
```

In the editor: **Cmd+Shift+P** → **Extensions: Install from VSIX…** → select `packages/extension/stealth-*.vsix` → **Reload Window**.

## Quick start

1. Run **`Stealth: Sign in to GitHub`** (uses the editor’s GitHub authentication).
2. Run **`Stealth: Open GitHub Repository…`** and pick `owner/repo` (you need push access to save).
3. In the sidebar, open **Remote Repository** and expand folders / open files.
4. Edit a file and press **Cmd+S** / **Ctrl+S** — changes push to GitHub via the Contents API.
5. Click **Stealth** in the **status bar** (bottom-right) for the **Dashboard** (cache, API quota, Stub Guard).

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

## Development

```bash
npm install
npm run build
npm run smoke    # build + package + sanity checks
```

Press **F5** and select **Run Stealth Extension** (Extension Development Host).

Regenerate the README demo GIF: `npm run demo-gif`

## Contributing

Bug reports and PRs are welcome: [github.com/Kingpranav21/stealth/issues](https://github.com/Kingpranav21/stealth/issues)

## License

[MIT](LICENSE) © contributors
