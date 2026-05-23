import * as fs from "fs/promises";
import * as path from "path";
import { RepoIndex, RepoRef } from "@stealth/shared";
import { indexFilePath, indexesDir } from "../paths";

export async function saveIndex(index: RepoIndex): Promise<string> {
  await fs.mkdir(indexesDir(), { recursive: true });
  const filePath = indexFilePath(index.repo);
  await fs.writeFile(filePath, JSON.stringify(index, null, 2), "utf-8");
  return filePath;
}

export async function loadIndex(repo: RepoRef): Promise<RepoIndex | undefined> {
  const filePath = indexFilePath(repo);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as RepoIndex;
  } catch {
    return undefined;
  }
}

export async function loadIndexByPath(
  indexPath: string
): Promise<RepoIndex | undefined> {
  try {
    const raw = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(raw) as RepoIndex;
  } catch {
    return undefined;
  }
}

export function dirnameIndex(indexPath: string): string {
  return path.dirname(indexPath);
}

export async function updateIndexEntrySha(
  indexPath: string,
  filePath: string,
  newSha: string,
  size?: number
): Promise<void> {
  const index = await loadIndexByPath(indexPath);
  if (!index) {
    return;
  }
  const entry = index.entries.find((e) => e.path === filePath);
  if (entry) {
    entry.sha = newSha;
    if (size !== undefined) {
      entry.size = size;
    }
  } else {
    index.entries.push({
      path: filePath,
      sha: newSha,
      size,
      type: "blob",
    });
  }
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

export async function removeIndexEntry(
  indexPath: string,
  filePath: string
): Promise<void> {
  const index = await loadIndexByPath(indexPath);
  if (!index) {
    return;
  }
  index.entries = index.entries.filter((e) => e.path !== filePath);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}
