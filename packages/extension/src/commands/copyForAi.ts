import * as vscode from "vscode";
import { documentIsStub } from "../guard/stubGuard";
import { getActiveStealthConfig } from "../workspace/config";
import { relativePathInWorkspace } from "./hydrateDocument";
import { hydrateRemoteFile } from "./openFile";

/**
 * Ensures the active file is hydrated, then copies full text for pasting into AI chat.
 * Solves: pasting a stub line into an AI chat by mistake.
 */
export async function copyHydratedFileForAi(): Promise<void> {
  const active = await getActiveStealthConfig();
  const editor = vscode.window.activeTextEditor;
  if (!active || !editor) {
    void vscode.window.showWarningMessage("Open a file in a Stealth workspace.");
    return;
  }

  const relative = relativePathInWorkspace(editor.document, active.root.fsPath);
  if (!relative) {
    return;
  }

  if (documentIsStub(editor.document)) {
    const go = await vscode.window.showWarningMessage(
      `${relative} is still a stub. Hydrate before copying for AI?`,
      "Hydrate & Copy"
    );
    if (go !== "Hydrate & Copy") {
      return;
    }
    const ok = await hydrateRemoteFile(relative);
    if (!ok) {
      return;
    }
    const doc = await vscode.workspace.openTextDocument(editor.document.uri);
    await vscode.env.clipboard.writeText(doc.getText());
  } else {
    await vscode.env.clipboard.writeText(editor.document.getText());
  }

  void vscode.window.showInformationMessage(
    `Copied ${relative} to clipboard (real GitHub content).`
  );
}
