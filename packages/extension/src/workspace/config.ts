import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import {
  CONFIG_FILE,
  STEALTH_DIR,
  StealthWorkspaceConfig,
} from "@stealth/shared";

export type { StealthWorkspaceConfig };

export async function writeWorkspaceConfig(
  workspaceRoot: string,
  config: StealthWorkspaceConfig
): Promise<void> {
  const dir = path.join(workspaceRoot, STEALTH_DIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, CONFIG_FILE),
    JSON.stringify(config, null, 2),
    "utf-8"
  );
}

export async function readWorkspaceConfig(
  folderUri: vscode.Uri
): Promise<StealthWorkspaceConfig | undefined> {
  const configPath = path.join(folderUri.fsPath, STEALTH_DIR, CONFIG_FILE);
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return JSON.parse(raw) as StealthWorkspaceConfig;
  } catch {
    return undefined;
  }
}

export async function getActiveStealthConfig(): Promise<
  | { config: StealthWorkspaceConfig; root: vscode.Uri }
  | undefined
> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return undefined;
  }

  const matches: Array<{ config: StealthWorkspaceConfig; root: vscode.Uri }> =
    [];
  for (const folder of folders) {
    const config = await readWorkspaceConfig(folder.uri);
    if (config) {
      matches.push({ config, root: folder.uri });
    }
  }

  if (matches.length === 0) {
    return undefined;
  }
  if (matches.length === 1) {
    return matches[0];
  }

  const preferred = matches.find((m) =>
    m.root.fsPath.includes(`${path.sep}.stealth${path.sep}workspaces${path.sep}`)
  );
  return preferred ?? matches[0];
}
