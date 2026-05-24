import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { fetchFileContent, GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import { mirrorFile } from "../mirror";
import { isStubContent } from "../explorer/stubSync";
import { touchCachedFile, evictCacheIfNeeded } from "../cache/meta";
import { setFileSha } from "../index/fileShas";
import { updateStatusBar } from "../statusBar";
import { refreshDashboardIfOpen } from "../dashboard/panel";
import { getActiveStealthConfig } from "../workspace/config";
import { isBloatPath, bloatBlockMessage } from "../guard/bloatBlocklist";
import { hasProAccess, requireProAccess } from "../licensing/access";

export async function hydrateRemoteFile(
  relativePath: string,
  options?: { silent?: boolean }
): Promise<boolean> {
  if (!(await hasProAccess())) {
    if (!options?.silent) {
      await requireProAccess("loading files from GitHub");
    }
    return false;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    return false;
  }

  if (isBloatPath(relativePath)) {
    if (!options?.silent) {
      void vscode.window.showWarningMessage(bloatBlockMessage(relativePath));
    }
    return false;
  }

  const fullPath = path.join(active.root.fsPath, relativePath);
  try {
    const existing = await fs.readFile(fullPath);
    if (!isStubContent(existing)) {
      return true;
    }
  } catch {
    // missing — fetch
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return false;
  }

  const file = await fetchFileContent(token, active.config.repo, relativePath);

  if (file.encoding === "binary") {
    if (!options?.silent) {
      void vscode.window.showWarningMessage(
        `${relativePath} looks binary — not opened in editor.`
      );
    }
    return false;
  }

  await mirrorFile(active.root.fsPath, relativePath, file.content);
  await setFileSha(active.root.fsPath, relativePath, file.sha);
  await touchCachedFile(active.root.fsPath, relativePath, file.content.byteLength);
  await evictCacheIfNeeded(active.root.fsPath);
  void updateStatusBar();
  refreshDashboardIfOpen();
  return true;
}

export async function openRemoteFile(relativePath: string): Promise<void> {
  if (!(await requireProAccess("opening files"))) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showErrorMessage("Open a Stealth workspace first.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Loading ${relativePath}`,
    },
    async () => {
      try {
        const ok = await hydrateRemoteFile(relativePath);
        if (!ok) {
          return;
        }
        const uri = vscode.Uri.file(
          path.join(active.root.fsPath, relativePath)
        );
        const { applyDiskContentToOpenEditors } = await import(
          "./hydrateDocument"
        );
        await applyDiskContentToOpenEditors(uri);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Could not open file: ${msg}`);
      }
    }
  );
}
