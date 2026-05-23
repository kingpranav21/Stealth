import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { isStubContent } from "../explorer/stubSync";
import { isStealthInternalPath } from "../index/fileShas";
import { getActiveStealthConfig } from "../workspace/config";
import { hydrateRemoteFile } from "./openFile";

const hydrating = new Set<string>();

export function relativePathInWorkspace(
  doc: vscode.TextDocument,
  workspaceRoot: string
): string | undefined {
  if (doc.uri.scheme !== "file") {
    return undefined;
  }
  const relative = path
    .relative(workspaceRoot, doc.uri.fsPath)
    .replace(/\\/g, "/");
  if (!relative || relative.startsWith("..") || isStealthInternalPath(relative)) {
    return undefined;
  }
  return relative;
}

/** Replace editor buffer with current bytes on disk (avoids VS Code document cache). */
export async function applyDiskContentToOpenEditors(
  uri: vscode.Uri
): Promise<void> {
  const content = await vscode.workspace.fs.readFile(uri);
  const text = Buffer.from(content).toString("utf-8");
  const uriKey = uri.toString();

  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.uri.toString() !== uriKey) {
      continue;
    }
    const doc = editor.document;
    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, fullRange, text);
    await vscode.workspace.applyEdit(edit);
  }
}

/**
 * If file is a stub on disk (or editor is out of sync), fetch from GitHub and refresh the editor.
 */
export async function hydrateDocumentIfStub(
  doc: vscode.TextDocument,
  options?: { silent?: boolean; reveal?: boolean }
): Promise<boolean> {
  const active = await getActiveStealthConfig();
  if (!active) {
    return false;
  }

  const relative = relativePathInWorkspace(doc, active.root.fsPath);
  if (!relative || hydrating.has(relative)) {
    return false;
  }

  const fullPath = path.join(active.root.fsPath, relative);
  let onDisk: Buffer | undefined;
  try {
    onDisk = await fs.readFile(fullPath);
  } catch {
    onDisk = undefined;
  }

  const editorIsStub = isStubContent(Buffer.from(doc.getText(), "utf-8"));
  const diskIsStub = !onDisk || isStubContent(onDisk);

  if (!diskIsStub && !editorIsStub) {
    return false;
  }

  // Editor still shows pre-eviction content while disk is a stub — sync editor to disk first.
  if (onDisk && diskIsStub && !editorIsStub) {
    await applyDiskContentToOpenEditors(doc.uri);
  }

  if (!diskIsStub && !editorIsStub) {
    return false;
  }

  hydrating.add(relative);
  try {
    const run = async () => {
      await hydrateRemoteFile(relative, { silent: true });
      await applyDiskContentToOpenEditors(doc.uri);
    };

    if (!options?.silent) {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: `Loading ${relative} from GitHub`,
        },
        run
      );
    } else {
      await run();
    }

    if (options?.reveal) {
      const refreshed = vscode.workspace.textDocuments.find(
        (d) => d.uri.toString() === doc.uri.toString()
      );
      if (refreshed) {
        await vscode.window.showTextDocument(refreshed, {
          preview: false,
          preserveFocus: false,
        });
      }
    }
    return true;
  } finally {
    hydrating.delete(relative);
  }
}

/** After eviction, update any open tabs that still show old hydrated content. */
export async function refreshEditorsAfterEviction(
  workspaceRoot: string,
  evictedPaths: string[]
): Promise<void> {
  const set = new Set(evictedPaths);
  for (const doc of vscode.workspace.textDocuments) {
    const relative = relativePathInWorkspace(doc, workspaceRoot);
    if (relative && set.has(relative)) {
      await applyDiskContentToOpenEditors(doc.uri);
    }
  }
}
