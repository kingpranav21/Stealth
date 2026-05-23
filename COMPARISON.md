# How Stealth is different from GitHub (in Cursor)

“GitHub” in daily use usually means **three different things**. Stealth overlaps with some of them but is built for a different job.

| Approach | What it is | Local disk |
|----------|------------|------------|
| **`git clone`** | Full repo + `.git` on your Mac | Often GBs |
| **GitHub extension** | PRs, issues, auth, sometimes “clone repo” | Clone-sized if you clone |
| **GitHub Repositories** (built into VS Code/Cursor) | Virtual / sparse remote workspace | Varies; not a clear MB cap you set |
| **Codespaces / github.dev** | VM or browser editor on GitHub | Almost none locally |
| **Stealth** | Index + download only files you open; cap + evict | **You choose** (e.g. 500 MB) |

---

## One-sentence difference

**GitHub tools assume a real git workspace (clone or cloud VM). Stealth assumes you only want a bounded slice of the repo on disk and are fine using the API for git-like actions.**

---

## What Stealth optimizes for

- **Small SSD** — many repos without 5–20 GB each  
- **Fast open** — shallow index, lazy folders on huge repos  
- **Transparent cache** — status bar `cache used / cap`, LRU eviction, pin files or whole workspace  
- **Light edits** — open file → edit → Cmd+S → GitHub Contents API  

## What GitHub (extension + clone) optimizes for

- **Full git** — branches, merge, rebase, stash, hooks  
- **PR workflow** — review, comment, checks, merge in UI  
- **Run & test** — terminal, `npm test`, debugger, Docker  
- **CI / Actions** — local act, pre-push hooks, etc.  

---

## Feature matrix

| Capability | `git clone` | GitHub PR extension | Codespace / github.dev | Stealth |
|------------|-------------|---------------------|-------------------------|---------|
| Open repo without full clone | No | No (typically clones) | Yes (cloud) | **Yes** |
| **Set max MB for file contents locally** | No | No | N/A (cloud) | **`stealth.cacheMaxMb`** |
| LRU evict file bodies, keep names | No | No | N/A | **Yes** |
| Pin paths / workspace from eviction | No | No | N/A | **Yes** |
| Open PR / review in editor | Via extension | **Yes** | **Yes** | Link only (compare URL) |
| Create PR end-to-end in IDE | Yes (git push + UI) | **Yes** | **Yes** | Opens browser compare |
| Local terminal in repo | **Yes** | After clone | **Yes** | **No** |
| `npm test` / build | **Yes** | After clone | **Yes** | **No** |
| Offline edit | **Yes** | After clone | No | Only cached files |
| Full `git log` / `git blame` locally | **Yes** | After clone | **Yes** | API-based (history/blame commands) |
| Branch switch | **Yes** (instant local) | Yes | Yes | Yes (new workspace folder per branch) |
| Save to GitHub | `git push` | `git push` | `git push` | **Contents API** (per-file commits) |
| Conflict handling | Git merge | Git | Git | SHA check + compare / pull |
| Huge monorepo | Sparse checkout / partial | Clone or remote | Full VM | **Shallow index + lazy tree** |
| API quota visible | No | No | N/A | **Status bar + Cache Actions** |
| Low-quota warning | No | No | N/A | **Yes** (`rateLimitWarnAt`) |
| Where data lives | `./repo/.git` | Clone path | Cloud | `~/.stealth/` |

---

## Mental model

```text
git clone     →  entire history + all blobs you checkout  →  disk = repo size
GitHub ext    →  git workflows + PR UI on top of clone    →  disk = clone size
Codespace     →  repo lives in GitHub’s VM               →  disk ≈ 0 locally
Stealth       →  index (small) + cache (capped)          →  disk = what you opened
```

Stealth is closest to **“GitHub Repositories without owning the whole tree”**, but with an **explicit cache budget** and **eviction** as the product feature—not an implementation detail.

---

## When to use which

| Situation | Use |
|-----------|-----|
| Fix typo in README on a 2 GB repo | **Stealth** |
| Review a teammate’s PR with inline comments | **GitHub PR extension** |
| Run tests before merge | **Clone** or **Codespace** |
| 50 repos you might touch this week | **Stealth** (open many, little disk) |
| Rebase / complex merge | **Clone** |
| Need LSP across whole monorepo | **Clone** or **Codespace** (Stealth only hydrates opened paths) |
| Stealth hit limits (no terminal, API quota) | **Stealth → Open in Codespace** (built-in link) |

---

## What Stealth is *not*

- Not a replacement for the **GitHub Pull Requests** extension  
- Not **git** — no local `.git`, no merge/rebase, no hooks  
- Not **offline-first** — needs GitHub for open/save (except already-cached files)  
- Not **GitLab / Bitbucket** (v1 is GitHub-only)  

---

## Stealth-only controls (GitHub doesn’t offer these)

| Setting | Purpose |
|---------|---------|
| `stealth.cacheMaxMb` | Hard cap on hydrated file bytes |
| `stealth.pinnedPaths` | Files never evicted |
| Workspace **Pin cache** | Whole repo workspace never evicted |
| `stealth.indexMode` | `shallow` (fast) vs `full` (full tree index) |
| `stealth.maxExplorerStubs` | Avoid flooding Explorer on large repos |
| `stealth.checkRemoteBeforeSave` | Warn if GitHub changed file since load |
| `stealth.rateLimitWarnAt` | Warn before calls when API quota is low |

---

## Summary

| | GitHub (clone + extension) | Stealth |
|--|---------------------------|---------|
| **Promise** | Full dev + collaboration | Minimal disk, fast browse/edit |
| **Cost on Mac** | Grows with every clone | Bounded by your cache cap |
| **Best for** | Real development & PRs | Triage, small edits, many repos |

Use **both**: Stealth to open and patch; **Codespace or clone** when you need the real environment.

---

## Only in Stealth ([UNIQUE.md](./UNIQUE.md))

| Feature | Problem it solves |
|---------|-------------------|
| **Stub Guard** | AI / @-mentions read placeholder stub text, not real code |
| **Disk Governor** | Total `~/.stealth` footprint across many repos |
| **Bloat blocklist** | Never hydrate `node_modules`, lockfiles, build output |
| **Copy for AI** | Clipboard gets hydrated content, not stub line |
