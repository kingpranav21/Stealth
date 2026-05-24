import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { CONFIG_FILE, STEALTH_DIR } from "@stealth/shared";
import { workspacesDir } from "../paths";
import { requireProAccess } from "../licensing/access";

interface WorkspacePick extends vscode.QuickPickItem {
  root: string;
}

/** Open a previous Stealth workspace under ~/.stealth/workspaces */
export async function switchStealthWorkspace(): Promise<void> {
  if (!(await requireProAccess("switching workspaces"))) {
    return;
  }

  const root = workspacesDir();
  let dirs: string[] = [];
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
  } catch {
    void vscode.window.showWarningMessage(
      "No Stealth workspaces yet. Run Stealth: Open GitHub Repository…"
    );
    return;
  }

  const picks: WorkspacePick[] = [];
  for (const dir of dirs) {
    const configPath = path.join(dir, STEALTH_DIR, CONFIG_FILE);
    try {
      const raw = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(raw) as {
        repo: { owner: string; repo: string; branch: string };
      };
      picks.push({
        label: `${config.repo.owner}/${config.repo.repo}`,
        description: config.repo.branch,
        detail: dir,
        root: dir,
      });
    } catch {
      picks.push({
        label: path.basename(dir),
        description: "Unknown workspace",
        root: dir,
      });
    }
  }

  if (!picks.length) {
    void vscode.window.showWarningMessage("No Stealth workspaces found.");
    return;
  }

  picks.sort((a, b) => a.label.localeCompare(b.label));

  const pick = await vscode.window.showQuickPick(picks, {
    title: "Switch Stealth Workspace",
    placeHolder: "Open a repo already on disk under ~/.stealth",
  });

  if (!pick) {
    return;
  }

  await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(pick.root), {
    forceNewWindow: false,
  });
}
