import * as vscode from "vscode";
import { fetchRepoIndex, GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";
import { applyIndexToWorkspace } from "../workspace/applyIndex";
import { reloadStealthWorkspace } from "../workspace/reload";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";
import { requireProAccess } from "../licensing/access";

/**
 * Walk the full git tree (recursive) and rebuild the index.
 * Use when shallow index is too limited for Browse / search.
 */
export async function runDeepIndex(
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  if (!(await requireProAccess("deep indexing"))) {
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
      title: "Deep index (full tree)",
    },
    async () => {
      try {
        const index = await fetchRepoIndex(token, active.config.repo);
        await applyIndexToWorkspace(active.root.fsPath, active.config.repo, index);
        if (treeProvider) {
          await reloadStealthWorkspace(treeProvider);
        }
        const note = index.truncated
          ? " (GitHub truncated the tree — lazy mode may still apply)"
          : "";
        void vscode.window.showInformationMessage(
          `Deep index complete — ${index.entries.length} files${note}.`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Deep index failed: ${msg}`);
      }
    }
  );
}
