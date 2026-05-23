import * as vscode from "vscode";
import { STUB_MARKER } from "../explorer/stubSync";
import { getActiveStealthConfig } from "../workspace/config";
import { relativePathInWorkspace } from "../commands/hydrateDocument";

const warnedUris = new Set<string>();

let stubStatusItem: vscode.StatusBarItem | undefined;
let decorationType: vscode.TextEditorDecorationType | undefined;

export function documentIsStub(doc: vscode.TextDocument): boolean {
  const text = doc.getText();
  const marker = STUB_MARKER.trim();
  return (
    text === STUB_MARKER ||
    text === `${marker}\n` ||
    text.startsWith(marker)
  );
}

export function registerStubGuard(context: vscode.ExtensionContext): void {
  decorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: new vscode.ThemeColor("editorWarning.background"),
    overviewRulerColor: new vscode.ThemeColor("editorWarning.foreground"),
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });

  stubStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    199
  );
  stubStatusItem.command = "stealth.hydrateActiveFile";
  stubStatusItem.tooltip =
    "This file is a Stealth stub — Cursor AI and search see placeholder text, not real code. Click to hydrate.";
  context.subscriptions.push(decorationType, stubStatusItem);

  const refresh = () => void updateStubGuardUi();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (vscode.window.activeTextEditor?.document === e.document) {
        refresh();
      }
    })
  );

  void updateStubGuardUi();
}

async function updateStubGuardUi(): Promise<void> {
  if (!stubStatusItem || !decorationType) {
    return;
  }

  const enabled = vscode.workspace
    .getConfiguration("stealth")
    .get<boolean>("stubGuard", true);

  const editor = vscode.window.activeTextEditor;
  const active = await getActiveStealthConfig();

  if (
    !enabled ||
    !editor ||
    !active ||
    !documentIsStub(editor.document)
  ) {
    stubStatusItem.hide();
    editor?.setDecorations(decorationType, []);
    return;
  }

  const relative = relativePathInWorkspace(
    editor.document,
    active.root.fsPath
  );
  if (!relative) {
    stubStatusItem.hide();
    editor.setDecorations(decorationType, []);
    return;
  }

  stubStatusItem.text = "$(warning) Stub file — hydrate for real code";
  stubStatusItem.show();

  const lineCount = editor.document.lineCount;
  const ranges: vscode.DecorationOptions[] = [
    {
      range: new vscode.Range(0, 0, Math.min(2, lineCount - 1), 0),
      renderOptions: {
        after: {
          contentText: "  ← Stealth stub: AI sees this placeholder, not GitHub",
          color: new vscode.ThemeColor("editorWarning.foreground"),
        },
      },
    },
  ];
  editor.setDecorations(decorationType, ranges);

  const uriKey = editor.document.uri.toString();
  if (!warnedUris.has(uriKey)) {
    warnedUris.add(uriKey);
    void vscode.window
      .showWarningMessage(
        `${relative} is a Stealth stub. @-mentions and AI use placeholder text until you hydrate.`,
        "Hydrate now"
      )
      .then((choice) => {
        if (choice === "Hydrate now") {
          void vscode.commands.executeCommand("stealth.hydrateActiveFile");
        }
      });
  }
}

export function clearStubWarnForUri(uri: vscode.Uri): void {
  warnedUris.delete(uri.toString());
}
