# What only Stealth solves

Other tools let you open GitHub **without a full clone** (Codespaces, github.dev, Remote Repositories). Almost **nobody** solves the failures that appear **after** you do that—especially with **AI in the editor**.

---

## 1. Stub Guard (AI honesty)

**Problem:** Stealth (and stub-based workflows) keep **file names** on disk but replace **content** with a one-line placeholder after eviction or before first open:

```text
# Stealth remote file — open or save to load from GitHub.
```

**Cursor, Copilot, and @-file chat read that literal text.** You ask about `api.ts` and the model “sees” the stub—not your repo. No clone tool warns you; GitHub doesn’t have this failure mode.

**Stealth:** **Stub Guard** — warning stripe, status bar `Stub file — hydrate for real code`, one-time toast, **Hydrate now**. Optional **Copy Hydrated File for AI** so clipboard never gets stub text.

**Setting:** `stealth.stubGuard` (default on)

---

## 2. Disk Governor (one budget for the whole Mac)

**Problem:** You open 15 repos with “light” workflows. Each stays under 500 MB, but **`~/.stealth` totals 6 GB**. No GitHub product shows or caps **aggregate** partial-checkout disk.

**Stealth:** **`stealth.globalCacheMaxMb`** — LRU eviction **across all workspaces** under `~/.stealth/workspaces/`. **Disk Governor** command shows per-repo breakdown and global evict.

Per-repo cap (`stealth.cacheMaxMb`) + global cap = disk policy you can reason about.

---

## 3. Bloat blocklist (don’t hydrate the useless bytes)

**Problem:** Without `.gitignore` discipline, it’s easy to open or hydrate `node_modules`, lockfiles, or `dist/` through a remote tree—wasting SSD and API quota. Clone avoids this by not checking those out; remote UIs often don’t.

**Stealth:** Default **bloat blocklist** — refuse to hydrate `node_modules`, `.git`, lockfiles, minified bundles, etc. Protects **disk and AI context** at once.

**Setting:** `stealth.bloatBlocklist`

---

## Positioning one-liner

> **Stealth is the only GitHub-in-Cursor workflow that treats partial disk as a first-class product:** capped cache, global budget, stub detection for AI, and bloat blocking—not just “open repo remotely.”

See also [COMPARISON.md](./COMPARISON.md).
