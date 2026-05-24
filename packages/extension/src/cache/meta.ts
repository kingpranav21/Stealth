import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import {
  STEALTH_DIR,
  cacheMaxBytesFromMb,
  formatBytes,
  totalCacheBytes as sumCacheFileBytes,
} from "@stealth/shared";
import { isStubContent, writeStub } from "../explorer/stubSync";
import { isStealthInternalPath } from "../index/fileShas";
import { readWorkspaceConfig } from "../workspace/config";
import { updateStatusBar } from "../statusBar";
import { refreshDashboardIfOpen } from "../dashboard/panel";

const META_FILE = "cache-meta.json";

export interface CacheFileEntry {
  bytes: number;
  lastAccessed: string;
}

export interface CacheMeta {
  files: Record<string, CacheFileEntry>;
}

function metaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, STEALTH_DIR, META_FILE);
}

export async function loadCacheMeta(workspaceRoot: string): Promise<CacheMeta> {
  try {
    const raw = await fs.readFile(metaPath(workspaceRoot), "utf-8");
    return JSON.parse(raw) as CacheMeta;
  } catch {
    return { files: {} };
  }
}

export async function saveCacheMeta(
  workspaceRoot: string,
  meta: CacheMeta
): Promise<void> {
  await fs.mkdir(path.join(workspaceRoot, STEALTH_DIR), { recursive: true });
  await fs.writeFile(metaPath(workspaceRoot), JSON.stringify(meta, null, 2), "utf-8");
}

export function getCacheMaxBytes(): number {
  const mb = vscode.workspace
    .getConfiguration("stealth")
    .get<number>("cacheMaxMb", 500);
  return cacheMaxBytesFromMb(mb);
}

export async function touchCachedFile(
  workspaceRoot: string,
  relativePath: string,
  bytes: number
): Promise<void> {
  if (isStealthInternalPath(relativePath)) {
    return;
  }
  const meta = await loadCacheMeta(workspaceRoot);
  meta.files[relativePath] = {
    bytes,
    lastAccessed: new Date().toISOString(),
  };
  await saveCacheMeta(workspaceRoot, meta);
}

export async function removeCacheEntry(
  workspaceRoot: string,
  relativePath: string
): Promise<void> {
  const meta = await loadCacheMeta(workspaceRoot);
  delete meta.files[relativePath];
  await saveCacheMeta(workspaceRoot, meta);
}

export function totalCacheBytes(meta: CacheMeta): number {
  return sumCacheFileBytes(meta.files);
}

export { formatBytes };

/** Scan disk and sync meta for hydrated (non-stub) files. */
export async function reconcileCacheMeta(workspaceRoot: string): Promise<CacheMeta> {
  const meta = await loadCacheMeta(workspaceRoot);
  const root = path.resolve(workspaceRoot);

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === STEALTH_DIR && dir === root) {
          continue;
        }
        await walk(full);
        continue;
      }
      if (!ent.isFile()) {
        continue;
      }
      const relative = path.relative(root, full).replace(/\\/g, "/");
      if (isStealthInternalPath(relative)) {
        continue;
      }
      const buf = await fs.readFile(full);
      if (isStubContent(buf)) {
        delete meta.files[relative];
        continue;
      }
      meta.files[relative] = {
        bytes: buf.byteLength,
        lastAccessed:
          meta.files[relative]?.lastAccessed ?? new Date().toISOString(),
      };
    }
  }

  await walk(root);
  await saveCacheMeta(workspaceRoot, meta);
  return meta;
}

export interface EvictResult {
  evicted: string[];
  freedBytes: number;
  remainingBytes: number;
}

/** Demote oldest hydrated files to stubs until under cap. */
export async function evictCacheIfNeeded(
  workspaceRoot: string,
  options?: { force?: boolean }
): Promise<EvictResult> {
  const maxBytes = getCacheMaxBytes();
  let meta = await reconcileCacheMeta(workspaceRoot);
  let total = totalCacheBytes(meta);

  const evicted: string[] = [];
  let freedBytes = 0;

  const wsConfig = await readWorkspaceConfig(
    vscode.Uri.file(workspaceRoot)
  );
  if (wsConfig?.cachePinned && !options?.force) {
    return { evicted, freedBytes, remainingBytes: total };
  }

  if (!options?.force && total <= maxBytes) {
    return { evicted, freedBytes, remainingBytes: total };
  }

  const pinned = new Set(
    vscode.workspace
      .getConfiguration("stealth")
      .get<string[]>("pinnedPaths", [])
  );

  const sorted = Object.entries(meta.files).sort(
    ([, a], [, b]) =>
      new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime()
  );

  for (const [relativePath, entry] of sorted) {
    if (!options?.force && total <= maxBytes) {
      break;
    }
    if (pinned.has(relativePath)) {
      continue;
    }

    const fullPath = path.join(workspaceRoot, relativePath);
    try {
      const buf = await fs.readFile(fullPath);
      if (isStubContent(buf)) {
        delete meta.files[relativePath];
        continue;
      }
      await writeStub(workspaceRoot, relativePath);
      delete meta.files[relativePath];
      total -= entry.bytes;
      freedBytes += entry.bytes;
      evicted.push(relativePath);
    } catch {
      delete meta.files[relativePath];
    }
  }

  await saveCacheMeta(workspaceRoot, meta);

  if (evicted.length > 0) {
    const { refreshEditorsAfterEviction } = await import(
      "../commands/hydrateDocument"
    );
    await refreshEditorsAfterEviction(workspaceRoot, evicted);
  }

  const globalResult = await import("./global").then((m) =>
    m.evictGlobalCacheIfNeeded()
  );
  void updateStatusBar();

  return { evicted, freedBytes, remainingBytes: total };
}

