import * as vscode from "vscode";
import { GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import {
  fetchIndexForMode,
  indexModeForWorkspace,
} from "../index/mode";
import { loadIndexByPath } from "../index/store";
import { applyIndexToWorkspace } from "../workspace/applyIndex";
import { reloadStealthWorkspace } from "../workspace/reload";
import { getActiveStealthConfig } from "../workspace/config";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";
import { requireProAccess } from "../licensing/access";

export async function refreshRemoteIndex(
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  if (!(await requireProAccess("refreshing the remote index"))) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showErrorMessage("No Stealth workspace is open.");
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Refreshing remote index",
    },
    async () => {
      try {
        const existing = await loadIndexByPath(active.config.indexPath);
        const mode = existing
          ? indexModeForWorkspace(existing)
          : active.config.shallow
            ? "shallow"
            : "full";
        const index = await fetchIndexForMode(token, active.config.repo, mode);
        await applyIndexToWorkspace(
          active.root.fsPath,
          active.config.repo,
          index
        );
        if (treeProvider) {
          await reloadStealthWorkspace(treeProvider);
        }
        void vscode.window.showInformationMessage(
          index.shallow
            ? "Index updated (shallow) — expand folders in Remote Repository."
            : `Index updated — ${index.entries.length} files.`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Refresh failed: ${msg}`);
      }
    }
  );
}
