import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { workspacesDir } from "../paths";
import { loadCacheMeta, saveCacheMeta } from "./meta";
import { writeStub, isStubContent } from "../explorer/stubSync";
import { readWorkspaceConfig } from "../workspace/config";
import { refreshEditorsAfterEviction } from "../commands/hydrateDocument";

export interface GlobalCacheRow {
  workspaceRoot: string;
  repoLabel: string;
  relativePath: string;
  bytes: number;
  lastAccessed: string;
}

export function getGlobalCacheMaxBytes(): number {
  const mb = vscode.workspace
    .getConfiguration("stealth")
    .get<number>("globalCacheMaxMb", 0);
  if (mb <= 0) {
    return 0;
  }
  return mb * 1024 * 1024;
}

export async function collectGlobalHydratedFiles(): Promise<GlobalCacheRow[]> {
  const root = workspacesDir();
  let dirs: string[] = [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
  } catch {
    return [];
  }

  const rows: GlobalCacheRow[] = [];
  for (const workspaceRoot of dirs) {
    const config = await readWorkspaceConfig(vscode.Uri.file(workspaceRoot));
    const label = config
      ? `${config.repo.owner}/${config.repo.repo}@${config.repo.branch}`
      : path.basename(workspaceRoot);

    const meta = await loadCacheMeta(workspaceRoot);
    for (const [relativePath, entry] of Object.entries(meta.files)) {
      rows.push({
        workspaceRoot,
        repoLabel: label,
        relativePath,
        bytes: entry.bytes,
        lastAccessed: entry.lastAccessed,
      });
    }
  }

  return rows;
}

export function totalGlobalBytes(rows: GlobalCacheRow[]): number {
  return rows.reduce((s, r) => s + r.bytes, 0);
}

function isPathPinned(
  workspaceRoot: string,
  relativePath: string,
  configPinned: boolean
): boolean {
  if (configPinned) {
    return true;
  }
  const pinned = vscode.workspace
    .getConfiguration("stealth")
    .get<string[]>("pinnedPaths", []);
  return pinned.includes(relativePath);
}

/** Evict hydrated files across *all* Stealth workspaces until under global cap. */
export async function evictGlobalCacheIfNeeded(): Promise<{
  evicted: number;
  freedBytes: number;
  remainingBytes: number;
}> {
  const max = getGlobalCacheMaxBytes();
  if (max <= 0) {
    const rows = await collectGlobalHydratedFiles();
    return { evicted: 0, freedBytes: 0, remainingBytes: totalGlobalBytes(rows) };
  }

  let rows = await collectGlobalHydratedFiles();
  let total = totalGlobalBytes(rows);
  if (total <= max) {
    return { evicted: 0, freedBytes: 0, remainingBytes: total };
  }

  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
  );

  let evicted = 0;
  let freedBytes = 0;
  const evictedByWorkspace = new Map<string, string[]>();

  for (const row of sorted) {
    if (total <= max) {
      break;
    }
    const config = await readWorkspaceConfig(vscode.Uri.file(row.workspaceRoot));
    if (isPathPinned(row.workspaceRoot, row.relativePath, Boolean(config?.cachePinned))) {
      continue;
    }

    const fullPath = path.join(row.workspaceRoot, row.relativePath);
    try {
      const buf = await fs.readFile(fullPath);
      if (isStubContent(buf)) {
        continue;
      }
      await writeStub(row.workspaceRoot, row.relativePath);
      const meta = await loadCacheMeta(row.workspaceRoot);
      delete meta.files[row.relativePath];
      await saveCacheMeta(row.workspaceRoot, meta);
      total -= row.bytes;
      freedBytes += row.bytes;
      evicted++;
      const list = evictedByWorkspace.get(row.workspaceRoot) ?? [];
      list.push(row.relativePath);
      evictedByWorkspace.set(row.workspaceRoot, list);
    } catch {
      // skip
    }
  }

  for (const [workspaceRoot, paths] of evictedByWorkspace) {
    await refreshEditorsAfterEviction(workspaceRoot, paths);
  }

  return { evicted, freedBytes, remainingBytes: total };
}

// Re-export saveCacheMeta for global.ts use - meta.ts has saveCacheMeta private
// I used loadCacheMeta and need save - check meta.ts
