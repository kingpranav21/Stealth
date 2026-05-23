import * as path from "path";
import * as vscode from "vscode";
import { githubBlobUrl, githubDevUrl, githubRepoUrl } from "../github/links";
import { getActiveStealthConfig } from "../workspace/config";

async function activeFilePath(): Promise<
  { repo: import("@stealth/shared").RepoRef; filePath?: string } | undefined
> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return undefined;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.uri.scheme !== "file") {
    return { repo: active.config.repo, filePath: undefined };
  }

  const relative = path
    .relative(active.root.fsPath, editor.document.uri.fsPath)
    .replace(/\\/g, "/");

  if (!relative || relative.startsWith("..") || relative.includes(".stealth")) {
    return { repo: active.config.repo, filePath: undefined };
  }

  return { repo: active.config.repo, filePath: relative };
}

export async function openOnGitHub(): Promise<void> {
  const ctx = await activeFilePath();
  if (!ctx) {
    return;
  }

  const url = ctx.filePath
    ? githubBlobUrl(ctx.repo, ctx.filePath)
    : githubRepoUrl(ctx.repo);
  await vscode.env.openExternal(vscode.Uri.parse(url));
}

export async function openInGithubDev(): Promise<void> {
  const ctx = await activeFilePath();
  if (!ctx) {
    return;
  }

  const url = githubDevUrl(ctx.repo, ctx.filePath);
  await vscode.env.openExternal(vscode.Uri.parse(url));
}
