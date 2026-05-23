import * as vscode from "vscode";
import { loadIndexByPath } from "../index/store";
import { syncExplorerStubs } from "../explorer/stubSync";
import { evictCacheIfNeeded } from "../cache/meta";
import { updateStatusBar } from "../statusBar";
import { syncPinWorkspaceContext } from "../commands/pinWorkspace";
import { getActiveStealthConfig } from "./config";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function syncWorkspaceContext(): Promise<boolean> {
  const active = await getActiveStealthConfig();
  const isRemote = Boolean(active?.config);
  await vscode.commands.executeCommand(
    "setContext",
    "stealth.isRemoteWorkspace",
    isRemote
  );
  return isRemote;
}

export async function reloadStealthWorkspace(
  treeProvider: RemoteTreeProvider
): Promise<void> {
  await syncWorkspaceContext();
  await syncPinWorkspaceContext();
  await treeProvider.refresh();

  const active = await getActiveStealthConfig();
  if (!active) {
    await updateStatusBar();
    return;
  }

  const index = await loadIndexByPath(active.config.indexPath);
  if (index?.entries.length && active.config.explorerStubs !== false) {
    const { written } = await syncExplorerStubs(
      active.root.fsPath,
      index.entries
    );
    if (written > 0 && written <= 5) {
      void vscode.window.showInformationMessage(
        `Stealth: ${written} file stub(s) added to Explorer.`
      );
    } else if (written > 5) {
      void vscode.window.showInformationMessage(
        `Stealth: ${written} file stubs added to Explorer.`
      );
    }
  }

  await evictCacheIfNeeded(active.root.fsPath);
  await updateStatusBar();
}
