import * as fs from "fs/promises";
import * as path from "path";
import { IndexEntry } from "@stealth/shared";
import { getMaxExplorerStubs } from "../workspace/flags";

export const STUB_MARKER =
  "# Stealth remote file — open or save to load from GitHub.\n";

/**
 * Creates empty placeholder files so the normal Explorer shows the repo tree.
 * Remote tree view is unreliable in some hosts; on-disk paths always show up.
 */
export async function syncExplorerStubs(
  workspaceRoot: string,
  entries: IndexEntry[]
): Promise<{ written: number; skipped: number }> {
  const max = getMaxExplorerStubs();
  if (entries.length > max) {
    return { written: 0, skipped: entries.length };
  }

  let written = 0;
  for (const entry of entries) {
    const fullPath = path.join(workspaceRoot, entry.path);
    try {
      await fs.access(fullPath);
      continue;
    } catch {
      // file missing — create stub
    }

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await writeStub(workspaceRoot, entry.path);
    written++;
  }

  return { written, skipped: 0 };
}

export async function writeStub(
  workspaceRoot: string,
  relativePath: string
): Promise<void> {
  const fullPath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, STUB_MARKER, "utf-8");
}

export function isStubContent(buffer: Uint8Array | Buffer): boolean {
  const text = Buffer.from(buffer).toString("utf-8");
  return text === STUB_MARKER || text.startsWith(STUB_MARKER.trim());
}
