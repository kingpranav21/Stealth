import * as path from "path";
import * as vscode from "vscode";
import { fetchBlameForFile, GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";

let enabled = false;
let loadingPath: string | undefined;

const decorationType = vscode.window.createTextEditorDecorationType({
  after: {
    color: new vscode.ThemeColor("editorCodeLens.foreground"),
    margin: "0 0 0 2em",
  },
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});

const blameCache = new Map<string, vscode.DecorationOptions[]>();

function cacheKey(root: string, relative: string): string {
  return `${root}:${relative}`;
}

async function decorationsForFile(
  root: string,
  repo: import("@stealth/shared").RepoRef,
  relative: string,
  token: string
): Promise<vscode.DecorationOptions[]> {
  const key = cacheKey(root, relative);
  const cached = blameCache.get(key);
  if (cached) {
    return cached;
  }

  const ranges = await fetchBlameForFile(token, repo, relative);
  const options: vscode.DecorationOptions[] = [];

  for (const r of ranges) {
    const label = `${r.shortSha} ${r.author.split(" ")[0] ?? r.author}`;
    for (let line = r.startingLine; line <= r.endingLine; line++) {
      const lineIndex = line - 1;
      options.push({
        range: new vscode.Range(lineIndex, 0, lineIndex, 0),
        renderOptions: {
          after: { contentText: ` ${label}` },
        },
      });
    }
  }

  blameCache.set(key, options);
  return options;
}

async function refreshActiveEditor(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!enabled || !editor) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    editor.setDecorations(decorationType, []);
    return;
  }

  const relative = path
    .relative(active.root.fsPath, editor.document.uri.fsPath)
    .replace(/\\/g, "/");

  if (
    editor.document.uri.scheme !== "file" ||
    !relative ||
    relative.startsWith("..") ||
    relative.includes(".stealth")
  ) {
    editor.setDecorations(decorationType, []);
    return;
  }

  const token = await getGitHubToken(false);
  if (!token) {
    return;
  }

  if (loadingPath === relative) {
    return;
  }
  loadingPath = relative;

  try {
    const decorations = await decorationsForFile(
      active.root.fsPath,
      active.config.repo,
      relative,
      token
    );
    if (
      vscode.window.activeTextEditor === editor &&
      enabled
    ) {
      editor.setDecorations(decorationType, decorations);
    }
  } catch (err) {
    if (!enabled) {
      return;
    }
    const msg =
      err instanceof GitHubApiError ? err.message : String(err);
    void vscode.window.showErrorMessage(`Blame gutter: ${msg}`);
    editor.setDecorations(decorationType, []);
  } finally {
    loadingPath = undefined;
  }
}

export function registerBlameGutter(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    decorationType,
    vscode.commands.registerCommand("stealth.toggleBlameGutter", async () => {
      enabled = !enabled;
      await vscode.commands.executeCommand(
        "setContext",
        "stealth.blameGutterOn",
        enabled
      );
      if (enabled) {
        void vscode.window.showInformationMessage(
          "Stealth blame annotations on (end of line)."
        );
        await refreshActiveEditor();
      } else {
        blameCache.clear();
        vscode.window.activeTextEditor?.setDecorations(decorationType, []);
        void vscode.window.showInformationMessage(
          "Stealth blame annotations off."
        );
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      if (enabled) {
        void refreshActiveEditor();
      }
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      const active = vscode.window.activeTextEditor?.document;
      if (active?.uri.toString() === doc.uri.toString()) {
        blameCache.clear();
      }
    })
  );
}
