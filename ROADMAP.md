# Stealth roadmap

## v0.10 (latest)

### Stealth Dashboard

Single panel: workspace + global disk + API quota + stub warning + action buttons. Status bar click opens Dashboard.

### Switch workspace + onboarding

Reopen prior `~/.stealth` workspaces; first-install welcome points to Dashboard or Open Repo.

---

## v0.9

Stub Guard, Disk Governor, bloat blocklist — see [UNIQUE.md](./UNIQUE.md).

---

## v0.8

### Create Pull Request

**What:** Opens GitHub compare (`default...your-branch`) so you can title and open a PR in the browser.

**Command:** `Stealth: Create Pull Request…` (hub + command palette).

### Rate-limit guard

**What:** When core API quota is at or below `stealth.rateLimitWarnAt` (default 100), Stealth warns once per session before heavy API calls.

### Ship kit

- [SHIP.md](./SHIP.md) — dogfood + publish checklist  
- [DEMO.md](./DEMO.md) — GIF recording script  
- [CHANGELOG.md](./CHANGELOG.md)

---

## v0.7

### GitHub API quota in status bar

**What:** After API calls, the status bar tooltip shows remaining GitHub REST quota (e.g. `4821/5000`).

### Compare & pull (conflict safety)

**What:** Diff your buffer vs GitHub before saving; pull remote over local; optional warning on save if GitHub changed.

**Commands:** `Compare with GitHub`, `Pull from GitHub`. Setting: `stealth.checkRemoteBeforeSave` (default on).

### Pin workspace cache

**What:** Pin the whole workspace so LRU eviction never demotes files (separate from per-file `pinnedPaths`).

**Command:** `Pin Workspace Cache` (also in Cache Actions).

### Pull Requests link

**What:** Open `github.com/owner/repo/pulls` in the browser.

**Command:** `Open Pull Requests on GitHub`.

---

## v0.6

### Find File (GitHub code search)

**What:** Search paths by name without a deep index. Uses GitHub’s code search API when the repo is shallow-indexed; filters locally when you have a full index.

**Commands:** `Stealth: Find File…` (`Cmd+Alt+F` in a Stealth workspace), or **Browse Remote Files** (same picker).

### Open on GitHub / github.dev

**What:** Jump from Stealth to the web UI — full repo tree on github.com or the in-browser editor at github.dev (active file if the editor has one open).

**Commands:** `Open on GitHub.com`, `Open in github.dev` (hub + editor context menu).

### Recent commits on branch

**What:** Repo-level `git log` on the current branch via REST — no clone.

**Command:** `Stealth: Recent Commits on Branch`.

### Blame annotations (gutter)

**What:** Optional end-of-line hints (`abc123 Author`) from GraphQL blame. Toggle on/off; cached per file.

**Command:** `Stealth: Toggle Blame Annotations`.

---

## v0.5 (shipped)

## 1. Open in GitHub Codespace

**What it is:** A bridge from “light local edit” to “full cloud dev environment.” Codespaces give you a VM with git, terminals, tests, and Docker — things Stealth intentionally skips.

**In Stealth:** **Stealth Menu → Open in GitHub Codespace…** or command `stealth.openInCodespace`. Opens `https://github.com/codespaces/new?repo=owner/repo&ref=branch` in your browser.

**When to use:** You hit limits of API-only editing and need `npm test`, debugger, or PR tools.

---

## 2. Shallow index

**What it is:** On open, Stealth no longer walks the **entire** git tree (which can be slow and huge). It fetches only the **root** in one API call, then loads subfolders when you expand **Remote Repository**.

**In Stealth:** Default `stealth.indexMode` = `shallow`. Run **Deep Index (Full Tree)** when you need a complete file list (e.g. Browse quick-pick over all files).

**When to use:** Always for first open; use Deep Index for small repos or when you need global file search via Browse.

---

## 3. Open VSX publish

**What it is:** Publishing the `.vsix` to [Open VSX](https://open-vsx.org) so anyone can install from the Extensions panel in Cursor.

**In repo:** [PUBLISHING.md](./PUBLISHING.md) + GitHub Action `.github/workflows/publish-openvsx.yml`.

**When to use:** When you are ready for public beta (needs `OPEN_VSX_TOKEN` secret).

---

## 4. File history & blame (no clone)

**What it is:** See **who changed a file** and **recent commits** using GitHub’s APIs — no `git clone`, no local `.git`.

**In Stealth:**

- **File History** — REST commits for path; pick a commit → opens on GitHub.
- **File Blame** — GraphQL blame ranges; opens a read-only summary document.

**When to use:** Quick context on the active file; for full diff/PR workflow still use GitHub or a Codespace.
