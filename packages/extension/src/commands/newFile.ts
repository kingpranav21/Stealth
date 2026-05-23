import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs/promises";
import { updateIndexEntrySha } from "../index/store";
import { getActiveStealthConfig } from "../workspace/config";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function newRemoteFile(
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("Open a Stealth workspace first.");
    return;
  }

  const input = await vscode.window.showInputBox({
    title: "New remote file",
    prompt: "Path in repo (e.g. src/hello.ts or notes.txt)",
    placeHolder: "path/to/file.ts",
    validateInput: (value) => {
      const trimmed = value.trim().replace(/^\//, "");
      if (!trimmed) {
        return "Enter a file path";
      }
      if (trimmed.includes("..")) {
        return "Invalid path";
      }
      if (trimmed.startsWith(".stealth")) {
        return "Cannot create under .stealth";
      }
      return undefined;
    },
  });

  if (!input) {
    return;
  }

  const relative = input.trim().replace(/^\//, "").replace(/\\/g, "/");
  const fullPath = path.join(active.root.fsPath, relative);

  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(fullPath));
    const open = await vscode.window.showWarningMessage(
      `${relative} already exists locally.`,
      "Open it"
    );
    if (open === "Open it") {
      const doc = await vscode.workspace.openTextDocument(
        vscode.Uri.file(fullPath)
      );
      await vscode.window.showTextDocument(doc);
    }
    return;
  } catch {
    // new path
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, "", "utf-8");
  await updateIndexEntrySha(active.config.indexPath, relative, "", 0);

  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.file(fullPath)
  );
  await vscode.window.showTextDocument(doc);

  await treeProvider?.refresh();
  void vscode.window.showInformationMessage(
    `Created ${relative}. Edit and save (Cmd+S) to push to GitHub.`
  );
}
