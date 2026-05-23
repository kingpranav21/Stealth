import * as vscode from "vscode";
import {
  getActiveStealthConfig,
  readWorkspaceConfig,
  writeWorkspaceConfig,
} from "../workspace/config";
import { updateStatusBar } from "../statusBar";

export async function togglePinWorkspaceCache(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const config = await readWorkspaceConfig(active.root);
  if (!config) {
    return;
  }

  const next = !config.cachePinned;
  await writeWorkspaceConfig(active.root.fsPath, {
    ...config,
    cachePinned: next,
  });

  await vscode.commands.executeCommand(
    "setContext",
    "stealth.workspaceCachePinned",
    next
  );

  void vscode.window.showInformationMessage(
    next
      ? "Workspace cache pinned — hydrated files will not be evicted."
      : "Workspace cache unpinned — LRU eviction applies again."
  );
  await updateStatusBar();
}

export async function syncPinWorkspaceContext(): Promise<void> {
  const active = await getActiveStealthConfig();
  await vscode.commands.executeCommand(
    "setContext",
    "stealth.workspaceCachePinned",
    Boolean(active?.config.cachePinned)
  );
}
