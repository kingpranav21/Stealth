import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

export async function mirrorFile(
  workspaceRoot: string,
  relativePath: string,
  content: Buffer
): Promise<string> {
  const fullPath = path.join(workspaceRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
  return fullPath;
}

export async function mirroredPathExists(
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> {
  try {
    await fs.access(path.join(workspaceRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

/** Remove a mirrored file from disk and empty parent folders up to workspace root. */
export async function removeMirroredFile(
  workspaceRoot: string,
  relativePath: string
): Promise<void> {
  const fullPath = path.join(workspaceRoot, relativePath);
  try {
    await fs.unlink(fullPath);
  } catch {
    return;
  }

  let dir = path.dirname(fullPath);
  const root = path.resolve(workspaceRoot);

  while (dir.startsWith(root) && dir !== root) {
    try {
      const entries = await fs.readdir(dir);
      if (entries.length > 0) {
        break;
      }
      await fs.rmdir(dir);
      dir = path.dirname(dir);
    } catch {
      break;
    }
  }
}

export async function closeEditorsForFile(fullPath: string): Promise<void> {
  const resolved = path.resolve(fullPath);
  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      const input = tab.input;
      if (
        input instanceof vscode.TabInputText &&
        path.resolve(input.uri.fsPath) === resolved
      ) {
        await vscode.window.tabGroups.close(tab);
      }
    }
  }
}
