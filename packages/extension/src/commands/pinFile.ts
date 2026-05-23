import * as vscode from "vscode";
import { getActiveStealthConfig } from "../workspace/config";
import { relativePathInWorkspace } from "./hydrateDocument";

export async function pinCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Open a file to pin.");
    return;
  }
  await pinPath(editor.document);
}

export async function unpinCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  await unpinPath(editor.document);
}

export async function pinPath(document: vscode.TextDocument): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    return;
  }
  const relative = relativePathInWorkspace(document, active.root.fsPath);
  if (!relative) {
    return;
  }

  const cfg = vscode.workspace.getConfiguration("stealth");
  const pinned = new Set(cfg.get<string[]>("pinnedPaths", []));
  pinned.add(relative);
  await cfg.update(
    "pinnedPaths",
    [...pinned],
    vscode.ConfigurationTarget.Workspace
  );
  void vscode.window.showInformationMessage(`Pinned ${relative} (never evicted).`);
}

export async function unpinPath(document: vscode.TextDocument): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    return;
  }
  const relative = relativePathInWorkspace(document, active.root.fsPath);
  if (!relative) {
    return;
  }

  const cfg = vscode.workspace.getConfiguration("stealth");
  const next = cfg.get<string[]>("pinnedPaths", []).filter((p) => p !== relative);
  await cfg.update("pinnedPaths", next, vscode.ConfigurationTarget.Workspace);
  void vscode.window.showInformationMessage(`Unpinned ${relative}.`);
}

export function isPathPinned(relativePath: string): boolean {
  const pinned = vscode.workspace
    .getConfiguration("stealth")
    .get<string[]>("pinnedPaths", []);
  return pinned.includes(relativePath);
}
