import * as vscode from "vscode";
import { formatBytes, getCacheMaxBytes, reconcileCacheMeta, totalCacheBytes } from "../cache/meta";
import {
  collectGlobalHydratedFiles,
  getGlobalCacheMaxBytes,
  totalGlobalBytes,
} from "../cache/global";
import { formatRateLimitTooltip, getRateLimitState } from "../github/rateLimit";
import { documentIsStub } from "../guard/stubGuard";
import { getActiveStealthConfig } from "../workspace/config";
import { relativePathInWorkspace } from "../commands/hydrateDocument";

export class StealthDashboardPanel {
  public static current: StealthDashboardPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;

  private constructor(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel
  ) {
    this.context = context;
    this.panel = panel;
    this.panel.onDidDispose(() => {
      StealthDashboardPanel.current = undefined;
    });
    this.panel.webview.onDidReceiveMessage((msg: { command: string }) => {
      void this.handleMessage(msg.command);
    });
  }

  public static createOrShow(context: vscode.ExtensionContext): void {
    if (StealthDashboardPanel.current) {
      StealthDashboardPanel.current.panel.reveal(vscode.ViewColumn.One);
      void StealthDashboardPanel.current.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "stealthDashboard",
      "Stealth GitHub Dashboard",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    StealthDashboardPanel.current = new StealthDashboardPanel(context, panel);
    void StealthDashboardPanel.current.refresh();
  }

  private async handleMessage(command: string): Promise<void> {
    const map: Record<string, string> = {
      openRepo: "stealth.openRepository",
      findFile: "stealth.findFile",
      hydrate: "stealth.hydrateActiveFile",
      copyAi: "stealth.copyForAi",
      evict: "stealth.evictCache",
      diskGovernor: "stealth.diskGovernor",
      createPr: "stealth.createPullRequest",
      cache: "stealth.cacheActions",
      settings: "workbench.action.openSettings",
      refresh: "",
    };

    if (command === "refresh") {
      await this.refresh();
      return;
    }

    const cmd = map[command];
    if (cmd) {
      if (command === "settings") {
        await vscode.commands.executeCommand(cmd, "stealth");
      } else {
        await vscode.commands.executeCommand(cmd);
      }
      await this.refresh();
    }
  }

  public async refresh(): Promise<void> {
    this.panel.webview.html = await this.buildHtml();
  }

  private async buildHtml(): Promise<string> {
    const active = await getActiveStealthConfig();
    const globalRows = await collectGlobalHydratedFiles();
    const globalUsed = totalGlobalBytes(globalRows);
    const globalMax = getGlobalCacheMaxBytes();
    const quota = getRateLimitState();

    let workspaceBlock = "<p>No workspace open.</p>";
    let stubAlert = "";

    if (active) {
      const meta = await reconcileCacheMeta(active.root.fsPath);
      const used = totalCacheBytes(meta);
      const max = getCacheMaxBytes();
      const { owner, repo, branch } = active.config.repo;
      const fileCount = Object.keys(meta.files).length;
      const modes = [
        active.config.shallow ? "shallow index" : null,
        active.config.lazyTree ? "lazy tree" : null,
        active.config.cachePinned ? "cache pinned" : null,
      ]
        .filter(Boolean)
        .join(", ");

      workspaceBlock = `
        <h2>Workspace</h2>
        <p class="mono">${owner}/${repo} @ ${branch}</p>
        <p>Cache: <strong>${formatBytes(used)}</strong> / ${formatBytes(max)} · ${fileCount} hydrated file(s)</p>
        <p class="muted">${modes || "full index"}</p>
      `;

      const editor = vscode.window.activeTextEditor;
      if (editor && documentIsStub(editor.document)) {
        const rel =
          relativePathInWorkspace(editor.document, active.root.fsPath) ??
          "active file";
        stubAlert = `
          <div class="alert">
            <strong>Stub Guard:</strong> <span class="mono">${rel}</span> is a placeholder.
            AI and @-mentions see stub text, not GitHub. Hydrate before trusting the editor or chat.
          </div>
        `;
      }
    }

    const byRepo = new Map<string, number>();
    for (const row of globalRows) {
      byRepo.set(row.repoLabel, (byRepo.get(row.repoLabel) ?? 0) + row.bytes);
    }
    const repoList = [...byRepo.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(
        ([name, bytes]) =>
          `<li><span class="mono">${escapeHtml(name)}</span> — ${formatBytes(bytes)}</li>`
      )
      .join("");

    const globalLine =
      globalMax > 0
        ? `${formatBytes(globalUsed)} / ${formatBytes(globalMax)} (Disk Governor active)`
        : `${formatBytes(globalUsed)} total — set <code>stealth.globalCacheMaxMb</code> to cap all repos`;

    const quotaLine = quota
      ? escapeHtml(formatRateLimitTooltip())
      : "Sign in and use GitHub to load API quota.";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
  <style>
    body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px 20px; line-height: 1.5; max-width: 720px; }
    h1 { font-size: 1.4em; margin: 0 0 8px; }
    h2 { font-size: 1.1em; margin: 20px 0 8px; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 4px; }
    .muted { opacity: 0.75; font-size: 0.9em; }
    .mono { font-family: var(--vscode-editor-font-family); }
    .alert { background: var(--vscode-inputValidation-warningBackground); border: 1px solid var(--vscode-inputValidation-warningBorder); padding: 10px 12px; border-radius: 4px; margin: 12px 0; }
    ul { padding-left: 1.2em; }
  </style>
</head>
<body>
  <h1>Stealth GitHub Dashboard</h1>
  <p class="muted">Partial GitHub workspaces with a disk budget — built for many repos and honest AI context.</p>
  ${stubAlert}
  ${workspaceBlock}
  <h2>Mac-wide disk (~/.stealth)</h2>
  <p>${escapeHtml(globalLine)}</p>
  <ul>${repoList || "<li class='muted'>No hydrated files yet</li>"}</ul>
  <h2>GitHub API</h2>
  <p>${quotaLine}</p>
  <h2>Actions</h2>
  <p>
    <button data-cmd="openRepo">Open repository</button>
    <button data-cmd="findFile">Find file</button>
    <button data-cmd="hydrate">Hydrate active file</button>
    <button data-cmd="copyAi">Copy for AI</button>
    <button data-cmd="evict">Evict workspace cache</button>
    <button data-cmd="diskGovernor">Disk Governor</button>
    <button data-cmd="createPr">Create pull request</button>
    <button data-cmd="cache">Cache menu</button>
    <button data-cmd="settings">Settings</button>
    <button data-cmd="refresh">Refresh</button>
  </p>
  <script>
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => vscode.postMessage({ command: btn.dataset.cmd }));
    });
  </script>
</body>
</html>`;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openStealthDashboard(context: vscode.ExtensionContext): void {
  StealthDashboardPanel.createOrShow(context);
}

/** Refresh dashboard when cache, quota, or workspace changes. */
export function refreshDashboardIfOpen(): void {
  void StealthDashboardPanel.current?.refresh();
}
