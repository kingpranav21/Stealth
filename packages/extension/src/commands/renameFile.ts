import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import {
  deleteFileContent,
  fetchFileContent,
  getRemoteFileSha,
  putFileContent,
  resolveBranch,
} from "../github/client";
import { getGitHubToken } from "../auth";
import { removeCacheEntry, touchCachedFile } from "../cache/meta";
import { getFileSha, removeFileSha, setFileSha } from "../index/fileShas";
import {
  removeIndexEntry,
  updateIndexEntrySha,
} from "../index/store";
import { closeEditorsForFile, removeMirroredFile } from "../mirror";
import { getActiveStealthConfig } from "../workspace/config";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function renameRemoteFile(
  uri?: vscode.Uri,
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!targetUri || targetUri.scheme !== "file") {
    void vscode.window.showWarningMessage(
      "Right-click a file or open it in the editor."
    );
    return;
  }

  const oldPath = path
    .relative(active.root.fsPath, targetUri.fsPath)
    .replace(/\\/g, "/");

  if (!oldPath || oldPath.startsWith("..") || oldPath.startsWith(".stealth")) {
    void vscode.window.showWarningMessage("Cannot rename this path.");
    return;
  }

  const newPathInput = await vscode.window.showInputBox({
    title: "Rename remote file",
    value: oldPath,
    prompt: "New path on GitHub",
    validateInput: (v) => {
      const t = v.trim().replace(/^\//, "");
      if (!t || t.includes("..") || t.startsWith(".stealth")) {
        return "Invalid path";
      }
      return undefined;
    },
  });

  if (!newPathInput) {
    return;
  }

  const newPath = newPathInput.trim().replace(/^\//, "").replace(/\\/g, "/");
  if (newPath === oldPath) {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Renaming ${oldPath} → ${newPath}`,
    },
    async () => {
      const repoRef = await resolveBranch(token, active.config.repo);
      const fullOld = path.join(active.root.fsPath, oldPath);

      let content: Buffer;
      try {
        content = await fs.readFile(fullOld);
      } catch {
        const remote = await fetchFileContent(token, repoRef, oldPath);
        content = remote.content;
      }

      const oldSha =
        (await getFileSha(active.root.fsPath, oldPath)) ??
        (await getRemoteFileSha(token, repoRef, oldPath));

      const newPathSha = await getRemoteFileSha(token, repoRef, newPath);
      const putResult = await putFileContent(token, repoRef, newPath, content, {
        message: `Rename ${oldPath} to ${newPath} via Stealth`,
        sha: newPathSha,
      });
      await setFileSha(active.root.fsPath, newPath, putResult.contentSha);

      if (oldSha) {
        try {
          await deleteFileContent(
            token,
            repoRef,
            oldPath,
            oldSha,
            `Rename ${oldPath} to ${newPath} via Stealth`
          );
        } catch {
          // ignore
        }
      }

      await removeIndexEntry(active.config.indexPath, oldPath);
      await updateIndexEntrySha(
        active.config.indexPath,
        newPath,
        putResult.contentSha,
        content.byteLength
      );

      await closeEditorsForFile(fullOld);
      await removeMirroredFile(active.root.fsPath, oldPath);
      await removeFileSha(active.root.fsPath, oldPath);
      await removeCacheEntry(active.root.fsPath, oldPath);

      const fullNew = path.join(active.root.fsPath, newPath);
      await fs.mkdir(path.dirname(fullNew), { recursive: true });
      await fs.writeFile(fullNew, content);
      await touchCachedFile(active.root.fsPath, newPath, content.byteLength);

      await treeProvider?.refresh();
      await vscode.commands.executeCommand(
        "workbench.files.action.refreshFilesExplorer"
      );

      void vscode.window.showInformationMessage(
        `Renamed on GitHub: ${oldPath} → ${newPath}`
      );
    }
  );
}
