import * as path from "path";
import * as vscode from "vscode";
import { RepoRef } from "@stealth/shared";
import { getActiveStealthConfig } from "./config";

export async function resolveActiveStealthFile(): Promise<
  | { repo: RepoRef; relative: string; root: string; document: vscode.TextDocument }
  | undefined
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

  return {
    repo: active.config.repo,
    relative,
    root: active.root.fsPath,
    document: editor.document,
  };
}
