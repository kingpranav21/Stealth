import * as vscode from "vscode";
import { clearStubWarnForUri } from "../guard/stubGuard";
import { getActiveStealthConfig } from "../workspace/config";
import { relativePathInWorkspace } from "./hydrateDocument";
import { hydrateRemoteFile } from "./openFile";
import { applyDiskContentToOpenEditors } from "./hydrateDocument";

export async function hydrateActiveFile(): Promise<void> {
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

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Hydrating ${relative}` },
    async () => {
      const ok = await hydrateRemoteFile(relative);
      if (!ok) {
        return;
      }
      clearStubWarnForUri(editor.document.uri);
      await applyDiskContentToOpenEditors(editor.document.uri);
      const doc = await vscode.workspace.openTextDocument(editor.document.uri);
      await vscode.window.showTextDocument(doc, { preview: false });
      void vscode.window.showInformationMessage(
        `${relative} loaded from GitHub — safe for AI and search.`
      );
    }
  );
}
