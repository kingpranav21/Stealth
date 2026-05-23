import * as path from "path";
import * as vscode from "vscode";
import {
  deleteFileContent,
  getRemoteFileSha,
  getRepository,
  GitHubApiError,
  putFileContent,
  resolveBranch,
} from "../github/client";
import { getGitHubToken } from "../auth";
import { isStubContent } from "../explorer/stubSync";
import {
  isStealthInternalPath,
  removeFileSha,
  setFileSha,
} from "../index/fileShas";
import { removeIndexEntry, updateIndexEntrySha } from "../index/store";
import {
  getActiveStealthConfig,
  writeWorkspaceConfig,
} from "../workspace/config";
import {
  touchCachedFile,
  evictCacheIfNeeded,
  removeCacheEntry,
} from "../cache/meta";
import {
  closeEditorsForFile,
  removeMirroredFile,
} from "../mirror";
import { updateStatusBar } from "../statusBar";
import { refreshDashboardIfOpen } from "../dashboard/panel";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";
import { hydrateRemoteFile } from "./openFile";
import { confirmSaveIfRemoteChanged } from "./compare";

const savingPaths = new Set<string>();

function defaultCommitMessage(relativePath: string): string {
  return `Update ${relativePath} via Stealth`;
}

async function persistBranchIfChanged(
  workspaceRoot: string,
  config: import("@stealth/shared").StealthWorkspaceConfig,
  resolved: import("@stealth/shared").RepoRef
): Promise<import("@stealth/shared").StealthWorkspaceConfig> {
  if (config.repo.branch === resolved.branch) {
    return config;
  }
  const updated = { ...config, repo: resolved };
  await writeWorkspaceConfig(workspaceRoot, updated);
  void vscode.window.showInformationMessage(
    `Stealth: branch updated to "${resolved.branch}" (previous branch was missing on GitHub).`
  );
  return updated;
}

export async function saveRemoteFile(
  document: vscode.TextDocument,
  options?: { commitMessage?: string }
): Promise<boolean> {
  const active = await getActiveStealthConfig();
  if (!active || document.uri.scheme !== "file") {
    return false;
  }

  const relative = path
    .relative(active.root.fsPath, document.uri.fsPath)
    .replace(/\\/g, "/");

  if (!relative || relative.startsWith("..") || isStealthInternalPath(relative)) {
    return false;
  }

  if (savingPaths.has(relative)) {
    return false;
  }

  const content = Buffer.from(document.getText(), "utf-8");

  if (isStubContent(content)) {
    void vscode.window.showWarningMessage(
      `${relative} is not loaded from GitHub yet. Open it first, then edit and save.`
    );
    return false;
  }

  if (content.includes(0)) {
    void vscode.window.showWarningMessage(
      `${relative} looks binary — Stealth cannot push it via the Contents API.`
    );
    return false;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return false;
  }

  savingPaths.add(relative);

  try {
    const { owner, repo } = active.config.repo;
    const meta = await getRepository(token, owner, repo);

    if (meta.permissions?.push === false) {
      void vscode.window.showErrorMessage(
        `You do not have push access to ${owner}/${repo}. Open your own repo or a fork (not octocat/Hello-World).`
      );
      return false;
    }

    let repoRef = await resolveBranch(token, active.config.repo);
    let config = await persistBranchIfChanged(
      active.root.fsPath,
      active.config,
      repoRef
    );
    repoRef = config.repo;

    const maySave = await confirmSaveIfRemoteChanged(
      token,
      active.root.fsPath,
      repoRef,
      relative
    );
    if (!maySave) {
      return false;
    }

    const blobSha = await getRemoteFileSha(token, repoRef, relative);

    const message =
      options?.commitMessage ??
      (await getCommitMessage(relative)) ??
      defaultCommitMessage(relative);

    const result = await putFileContent(
      token,
      repoRef,
      relative,
      content,
      { message, sha: blobSha }
    );

    await setFileSha(active.root.fsPath, relative, result.contentSha);
    await updateIndexEntrySha(
      config.indexPath,
      relative,
      result.contentSha,
      content.byteLength
    );

    await touchCachedFile(active.root.fsPath, relative, content.byteLength);
    await evictCacheIfNeeded(active.root.fsPath);
    void updateStatusBar();
    refreshDashboardIfOpen();

    void vscode.window.showInformationMessage(
      `Pushed ${relative} to GitHub (${repoRef.branch}).`
    );
    return true;
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 409) {
      const choice = await vscode.window.showErrorMessage(
        err.message,
        "Reload from GitHub",
        "Cancel"
      );
      if (choice === "Reload from GitHub") {
        await hydrateRemoteFile(relative);
        const doc = await vscode.workspace.openTextDocument(document.uri);
        await vscode.window.showTextDocument(doc);
      }
    } else {
      const msg = err instanceof GitHubApiError ? err.message : String(err);
      void vscode.window.showErrorMessage(`Save to GitHub failed: ${msg}`);
    }
    return false;
  } finally {
    savingPaths.delete(relative);
  }
}

async function getCommitMessage(
  relativePath: string
): Promise<string | undefined> {
  const cfg = vscode.workspace.getConfiguration("stealth");
  if (!cfg.get<boolean>("promptCommitMessage", false)) {
    return undefined;
  }
  return vscode.window.showInputBox({
    title: "Commit message",
    value: defaultCommitMessage(relativePath),
    prompt: "Message for this change on GitHub",
  });
}

export async function deleteRemoteFile(
  relativePath: string,
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active || isStealthInternalPath(relativePath)) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Delete ${relativePath} on GitHub (${active.config.repo.branch})?`,
    { modal: true },
    "Delete"
  );
  if (confirm !== "Delete") {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  try {
    const repoRef = await resolveBranch(token, active.config.repo);
    const blobSha = await getRemoteFileSha(token, repoRef, relativePath);
    if (!blobSha) {
      void vscode.window.showErrorMessage(
        `${relativePath} was not found on GitHub.`
      );
      return;
    }

    await deleteFileContent(
      token,
      repoRef,
      relativePath,
      blobSha,
      `Delete ${relativePath} via Stealth`
    );
    await removeFileSha(active.root.fsPath, relativePath);
    await removeCacheEntry(active.root.fsPath, relativePath);
    await removeIndexEntry(active.config.indexPath, relativePath);

    const fullPath = path.join(active.root.fsPath, relativePath);
    await closeEditorsForFile(fullPath);
    await removeMirroredFile(active.root.fsPath, relativePath);

    await treeProvider?.refresh();
    await vscode.commands.executeCommand(
      "workbench.files.action.refreshFilesExplorer"
    );
    void updateStatusBar();

    void vscode.window.showInformationMessage(
      `Deleted ${relativePath} on GitHub and removed locally.`
    );
  } catch (err) {
    const msg = err instanceof GitHubApiError ? err.message : String(err);
    void vscode.window.showErrorMessage(`Delete failed: ${msg}`);
  }
}
