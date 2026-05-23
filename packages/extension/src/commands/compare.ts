import * as vscode from "vscode";
import { fetchFileContent, getRemoteFileSha, GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import { getFileSha } from "../index/fileShas";
import { resolveActiveStealthFile } from "../workspace/activeFile";
import { hydrateRemoteFile } from "./openFile";

/** Side-by-side diff: GitHub version vs your editor buffer. */
export async function compareWithRemote(): Promise<void> {
  const file = await resolveActiveStealthFile();
  if (!file) {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Loading from GitHub" },
    async () => {
      try {
        const remote = await fetchFileContent(token, file.repo, file.relative);
        if (remote.encoding === "binary") {
          void vscode.window.showWarningMessage(
            `${file.relative} is binary — cannot show text diff.`
          );
          return;
        }

        const remoteDoc = await vscode.workspace.openTextDocument({
          content: remote.content.toString("utf-8"),
          language: file.document.languageId,
        });

        await vscode.commands.executeCommand(
          "vscode.diff",
          remoteDoc.uri,
          file.document.uri,
          `${file.relative}: GitHub ↔ Local`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Compare failed: ${msg}`);
      }
    }
  );
}

/** Overwrite local editor with the latest version from GitHub. */
export async function pullFromGitHub(): Promise<void> {
  const file = await resolveActiveStealthFile();
  if (!file) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Replace local ${file.relative} with GitHub (${file.repo.branch})? Unsaved edits will be lost.`,
    { modal: true },
    "Pull"
  );
  if (confirm !== "Pull") {
    return;
  }

  const ok = await hydrateRemoteFile(file.relative);
  if (ok) {
    const doc = await vscode.workspace.openTextDocument(file.document.uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    void vscode.window.showInformationMessage(`Pulled ${file.relative} from GitHub.`);
  }
}

/** Warn if GitHub blob SHA differs from what we last saved/loaded. */
export async function checkRemoteChanged(
  token: string,
  workspaceRoot: string,
  repo: import("@stealth/shared").RepoRef,
  relative: string
): Promise<"ok" | "changed" | "unknown"> {
  const known = await getFileSha(workspaceRoot, relative);
  if (!known) {
    return "unknown";
  }
  try {
    const remote = await getRemoteFileSha(token, repo, relative);
    if (!remote) {
      return "unknown";
    }
    return remote === known ? "ok" : "changed";
  } catch {
    return "unknown";
  }
}

export async function confirmSaveIfRemoteChanged(
  token: string,
  workspaceRoot: string,
  repo: import("@stealth/shared").RepoRef,
  relative: string
): Promise<boolean> {
  const cfg = vscode.workspace.getConfiguration("stealth");
  if (!cfg.get<boolean>("checkRemoteBeforeSave", true)) {
    return true;
  }

  const status = await checkRemoteChanged(token, workspaceRoot, repo, relative);
  if (status !== "changed") {
    return true;
  }

  const choice = await vscode.window.showWarningMessage(
    `${relative} changed on GitHub since you opened it.`,
    "Compare",
    "Save anyway",
    "Cancel"
  );

  if (choice === "Compare") {
    await compareWithRemote();
    return false;
  }
  if (choice === "Save anyway") {
    return true;
  }
  return false;
}
