import * as vscode from "vscode";
import {
  evictCacheIfNeeded,
  formatBytes,
  getCacheMaxBytes,
  reconcileCacheMeta,
  totalCacheBytes,
} from "../cache/meta";
import { getActiveStealthConfig } from "../workspace/config";
import { formatRateLimitTooltip, getRateLimitState } from "../github/rateLimit";
import { getGitHubToken } from "../auth";
import { refreshGitHubRateLimit } from "../github/client";

export async function runEvictCache(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const result = await evictCacheIfNeeded(active.root.fsPath, { force: true });
  if (result.evicted.length === 0) {
    void vscode.window.showInformationMessage(
      `Cache is ${formatBytes(result.remainingBytes)} (limit ${formatBytes(getCacheMaxBytes())}). Nothing to evict.`
    );
    return;
  }

  void vscode.window.showInformationMessage(
    `Evicted ${result.evicted.length} file(s), freed ${formatBytes(result.freedBytes)}. Cache now ${formatBytes(result.remainingBytes)}.`
  );
  await vscode.commands.executeCommand(
    "workbench.files.action.refreshFilesExplorer"
  );
}

export async function showCacheActions(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const meta = await reconcileCacheMeta(active.root.fsPath);
  const used = totalCacheBytes(meta);
  const max = getCacheMaxBytes();

  const token = await getGitHubToken(false);
  if (token) {
    try {
      await refreshGitHubRateLimit(token);
    } catch {
      // ignore
    }
  }
  const quota = getRateLimitState();
  const quotaDesc = quota
    ? formatRateLimitTooltip()
    : "Sign in and open a repo to load quota";

  const pick = await vscode.window.showQuickPick(
    [
      {
        label: "$(pulse) GitHub API quota",
        description: quotaDesc,
        action: "quota",
      },
      {
        label: "$(trash) Evict cache now",
        description: `Free space — ${formatBytes(used)} / ${formatBytes(max)} used`,
        action: "evict",
      },
      {
        label: "$(refresh) Reconcile cache stats",
        description: "Rescan workspace disk usage",
        action: "reconcile",
      },
      {
        label: "$(folder-opened) Browse remote files",
        action: "browse",
      },
      {
        label: "$(pin) Pin workspace cache",
        description: "Never evict hydrated files in this repo",
        action: "pinWorkspace",
      },
    ],
    { title: `Stealth cache: ${formatBytes(used)} / ${formatBytes(max)}` }
  );

  if (!pick) {
    return;
  }
  if (pick.action === "quota") {
    void vscode.window.showInformationMessage(quotaDesc);
    return;
  }
  if (pick.action === "evict") {
    await runEvictCache();
  } else if (pick.action === "reconcile") {
    await reconcileCacheMeta(active.root.fsPath);
    void vscode.window.showInformationMessage("Cache stats updated.");
  } else if (pick.action === "browse") {
    await vscode.commands.executeCommand("stealth.browseFiles");
  } else if (pick.action === "pinWorkspace") {
    await vscode.commands.executeCommand("stealth.pinWorkspaceCache");
  }
}
