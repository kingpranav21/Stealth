# Stealth — GitHub repos in VS Code without `git clone`

[![Open VSX version](https://img.shields.io/open-vsx/v/kingpranav21/stealth)](https://open-vsx.org/extension/kingpranav21/stealth)
[![Open VSX downloads](https://img.shields.io/badge/dynamic/json?url=https://open-vsx.org/api/kingpranav21/stealth&query=%24.downloadCount&label=downloads&logo=open-vsx&cacheSeconds=300)](https://open-vsx.org/extension/kingpranav21/stealth)

Open, browse, edit, and save **GitHub repositories** without a full local clone. Only files you open use meaningful disk space (`~/.stealth/`).

**Install:** [Open VSX — kingpranav21/stealth](https://open-vsx.org/extension/kingpranav21/stealth) · **Source:** [github.com/kingpranav21/stealth](https://github.com/kingpranav21/stealth)

---

## How to use (after install)

### 1. Reload the window

After installing from Open VSX: **Cmd+Shift+P** → **Developer: Reload Window**.

Only keep **one** Stealth extension enabled (disable any dev/VSIX copy) to avoid “already registered” errors.

### 2. Sign in to GitHub

**Cmd+Shift+P** → **`Stealth: Sign in to GitHub`**

Uses the editor’s GitHub sign-in (same as other GitHub extensions). You need permission to read/write repos you open.

### 3. Open a repository

**Cmd+Shift+P** → **`Stealth: Open GitHub Repository…`**

- Type `owner/repo` (e.g. `kingpranav21/stealth`) or paste a GitHub URL  
- Pick a branch if prompted  
- You need **push access** to save changes (your repo or your fork)

Stealth creates a workspace under `~/.stealth/workspaces/` — **not** a full `git clone`.

### 4. Browse files

- Sidebar → **Remote Repository** — expand folders and click files  
- Or **Explorer** — stub files may appear for indexed paths  
- **Cmd+Shift+P** → **`Stealth: Find File…`** (`Cmd+Alt+F`) to jump by name

**First time you open a file:** Stealth downloads real content from GitHub (hydration). Stub placeholders are replaced with actual code.

### 5. Edit and save to GitHub

1. Open a file and edit as usual  
2. **Cmd+S** / **Ctrl+S** to save  
3. Wait for **“Pushed … to GitHub”** in the notification

There is no local `.git` — save goes through the GitHub Contents API.

### 6. Dashboard and status bar

Click **Stealth** in the **bottom-right status bar** (or **Cmd+Shift+P** → **`Stealth: Stealth Dashboard`**) to see:

- Cache usage vs cap  
- GitHub API quota  
- Stub Guard warnings  
- Quick actions (hydrate, find file, evict cache, etc.)

### 7. Useful commands

Open the command palette (**Cmd+Shift+P**) and search **`Stealth`**:

| Command | When to use |
|---------|-------------|
| **Open GitHub Repository…** | Open another repo |
| **Find File…** | Search paths in the repo |
| **Hydrate Active File from GitHub** | Reload real content if you see a stub |
| **Stealth Dashboard** | Disk, API, workspace overview |
| **Compare with GitHub** / **Pull from GitHub** | Sync with remote |
| **Create Pull Request…** | Open compare/PR in browser |
| **Disk Governor (All Repos)…** | Cap total `~/.stealth` disk |
| **Cache Actions…** | Evict cached files, pin workspace |
| **Stealth Menu…** | All commands in one list |

### Tips

- **Stub Guard:** If AI or search sees placeholder text, run **Hydrate Active File** before sharing code.  
- **Large folders** (`node_modules`, lockfiles) are blocked from hydration by default.  
- **Run tests / `npm install` in repo:** use a real `git clone` or a Codespace — Stealth is for edit-and-push workflows.

### Settings (optional)

**Settings** → search **`stealth`**:

- `stealth.cacheMaxMb` — max disk per workspace (default 500)  
- `stealth.globalCacheMaxMb` — cap all repos under `~/.stealth` (0 = off)  
- `stealth.stubGuard` — warn on stub content in editor  

---

## Features

- Shallow / lazy repo index, on-demand file hydration  
- Save to GitHub via Contents API (no local `.git`)  
- **Stub Guard**, **Disk Governor**, Dashboard, find file, branch switch, PR link  

## Privacy & data

- **GitHub:** editor OAuth — tokens are not stored in the VSIX  
- **Local:** indexes and cache under `~/.stealth/` on your machine  
- **Network:** `api.github.com` when you browse, open, or save  
- **No** Stealth-owned telemetry  

## Support

Issues: https://github.com/kingpranav21/stealth/issues

## License

MIT — [LICENSE](https://github.com/kingpranav21/stealth/blob/main/LICENSE)
