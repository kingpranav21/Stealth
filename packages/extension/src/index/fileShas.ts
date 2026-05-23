import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG_FILE, STEALTH_DIR } from "@stealth/shared";

const SHA_FILE = "file-shas.json";

export type FileShaMap = Record<string, string>;

function shaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, STEALTH_DIR, SHA_FILE);
}

export async function loadFileShas(
  workspaceRoot: string
): Promise<FileShaMap> {
  try {
    const raw = await fs.readFile(shaPath(workspaceRoot), "utf-8");
    return JSON.parse(raw) as FileShaMap;
  } catch {
    return {};
  }
}

export async function setFileSha(
  workspaceRoot: string,
  relativePath: string,
  sha: string
): Promise<void> {
  const map = await loadFileShas(workspaceRoot);
  map[relativePath] = sha;
  await fs.mkdir(path.join(workspaceRoot, STEALTH_DIR), { recursive: true });
  await fs.writeFile(shaPath(workspaceRoot), JSON.stringify(map, null, 2), "utf-8");
}

export async function getFileSha(
  workspaceRoot: string,
  relativePath: string
): Promise<string | undefined> {
  const map = await loadFileShas(workspaceRoot);
  return map[relativePath];
}

export async function removeFileSha(
  workspaceRoot: string,
  relativePath: string
): Promise<void> {
  const map = await loadFileShas(workspaceRoot);
  delete map[relativePath];
  await fs.writeFile(shaPath(workspaceRoot), JSON.stringify(map, null, 2), "utf-8");
}

export function isStealthInternalPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return (
    normalized === STEALTH_DIR ||
    normalized.startsWith(`${STEALTH_DIR}/`) ||
    normalized.endsWith(CONFIG_FILE)
  );
}
