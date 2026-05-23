export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export interface StealthWorkspaceConfig {
  version: 1;
  repo: RepoRef;
  treeSha: string;
  workspaceId: string;
  indexPath: string;
  openedAt: string;
  /** Fetch folders from GitHub when expanding (large / truncated repos). */
  lazyTree?: boolean;
  /** Mirror file names into main Explorer (disabled for huge repos). */
  explorerStubs?: boolean;
  /** Index only loaded folders on demand (no full tree walk). */
  shallow?: boolean;
  /** Never LRU-evict hydrated files in this workspace. */
  cachePinned?: boolean;
}

export interface RecentRepo {
  owner: string;
  repo: string;
  branch: string;
  lastOpened: string;
}

export interface IndexEntry {
  path: string;
  sha: string;
  size?: number;
  type: "blob" | "tree";
}

export type IndexMode = "shallow" | "full";

export interface RepoIndex {
  repo: RepoRef;
  treeSha: string;
  truncated: boolean;
  /** True when only the repo root was indexed; use lazy tree + Deep Index for full list. */
  shallow?: boolean;
  fetchedAt: string;
  entries: IndexEntry[];
}

export const STEALTH_DIR = ".stealth";
export const CONFIG_FILE = "config.json";

export function workspaceId(repo: RepoRef): string {
  return `${repo.owner}-${repo.repo}-${repo.branch}`.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function parseRepoInput(input: string): RepoRef | undefined {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "");
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2) {
    return undefined;
  }
  const [owner, repo, branch] = parts;
  return { owner, repo, branch: branch ?? "" };
}
