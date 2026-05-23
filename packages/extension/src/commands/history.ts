import * as path from "path";
import * as vscode from "vscode";
import {
  fetchBlameForFile,
  GitHubApiError,
  listCommitsForPath,
} from "../github/client";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";

async function resolveActiveFilePath(): Promise<
  { relative: string; root: string } | undefined
> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return undefined;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== "file") {
    void vscode.window.showWarningMessage("Open a file in the Stealth workspace.");
    return undefined;
  }

  const relative = path
    .relative(active.root.fsPath, editor.document.uri.fsPath)
    .replace(/\\/g, "/");

  if (!relative || relative.startsWith("..") || relative.includes(".stealth")) {
    void vscode.window.showWarningMessage("Open a project file (not .stealth).");
    return undefined;
  }

  return { relative, root: active.root.fsPath };
}

/** Commit history for the active file via GitHub REST (no git clone). */
export async function showFileHistory(): Promise<void> {
  const file = await resolveActiveFilePath();
  if (!file) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Loading history" },
    async () => {
      try {
        const commits = await listCommitsForPath(
          token,
          active.config.repo,
          file.relative
        );
        if (!commits.length) {
          void vscode.window.showInformationMessage(
            `No commits found for ${file.relative} on ${active.config.repo.branch}.`
          );
          return;
        }

        const pick = await vscode.window.showQuickPick(
          commits.map((c) => ({
            label: `$(git-commit) ${c.shortSha}`,
            description: c.author,
            detail: `${c.message} · ${c.date.slice(0, 10)}`,
            commit: c,
          })),
          {
            title: `History: ${file.relative}`,
            placeHolder: "Select a commit to open on GitHub",
          }
        );

        if (pick) {
          await vscode.env.openExternal(vscode.Uri.parse(pick.commit.url));
        }
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`History failed: ${msg}`);
      }
    }
  );
}

/** Line blame in a read-only document (GitHub GraphQL). */
export async function showFileBlame(): Promise<void> {
  const file = await resolveActiveFilePath();
  if (!file) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Loading blame" },
    async () => {
      try {
        const ranges = await fetchBlameForFile(
          token,
          active.config.repo,
          file.relative
        );

        const lines = [
          `# Blame: ${file.relative}`,
          `# Branch: ${active.config.repo.branch}`,
          "",
          "Lines     Author          Commit   Message",
          "─────     ──────          ──────   ───────",
        ];

        for (const r of ranges) {
          const span =
            r.startingLine === r.endingLine
              ? `${r.startingLine}`.padStart(5)
              : `${r.startingLine}-${r.endingLine}`.padStart(9);
          lines.push(
            `${span}  ${r.author.slice(0, 14).padEnd(14)}  ${r.shortSha}  ${r.headline}`
          );
        }

        const doc = await vscode.workspace.openTextDocument({
          content: lines.join("\n"),
          language: "plaintext",
        });
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Blame failed: ${msg}`);
      }
    }
  );
}
