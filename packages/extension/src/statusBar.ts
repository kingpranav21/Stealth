import * as vscode from "vscode";
import {
  formatBytes,
  reconcileCacheMeta,
  totalCacheBytes,
  getCacheMaxBytes,
} from "./cache/meta";
import { getGitHubToken } from "./auth";
import { refreshGitHubRateLimit } from "./github/client";
import {
  formatRateLimitShort,
  formatRateLimitTooltip,
  getRateLimitState,
} from "./github/rateLimit";
import { getActiveStealthConfig } from "./workspace/config";
import { loadIndexByPath } from "./index/store";
import { refreshDashboardIfOpen } from "./dashboard/panel";

let item: vscode.StatusBarItem | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

export function createStatusBar(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    200
  );
  item.name = "Stealth";
  item.command = "stealth.dashboard";
  context.subscriptions.push(item);
  void updateStatusBar();
}

/** Call after GitHub API responses so quota text updates without a full reload. */
export function requestStatusBarUpdate(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  refreshTimer = setTimeout(() => {
    refreshTimer = undefined;
    void updateStatusBar({ skipQuotaFetch: true });
  }, 150);
}

export async function updateStatusBar(options?: {
  skipQuotaFetch?: boolean;
}): Promise<void> {
  if (!item) {
    return;
  }

  const active = await getActiveStealthConfig();
  if (!active) {
    item.text = "$(github) Stealth — open Dashboard";
    item.tooltip = "No Stealth workspace.\nClick for Dashboard or Open Repository.";
    item.command = "stealth.dashboard";
    item.show();
    return;
  }

  item.command = "stealth.dashboard";

  if (!options?.skipQuotaFetch) {
    const token = await getGitHubToken(false);
    if (token) {
      try {
        await refreshGitHubRateLimit(token);
      } catch {
        // Still show cache line if quota fetch fails (offline / auth).
      }
    }
  }

  const index = await loadIndexByPath(active.config.indexPath);
  const count = index?.entries.length ?? 0;
  const { owner, repo, branch } = active.config.repo;

  const meta = await reconcileCacheMeta(active.root.fsPath);
  const used = totalCacheBytes(meta);
  const max = getCacheMaxBytes();

  const pinned = active.config.cachePinned ? " $(pin)" : "";
  const api = formatRateLimitShort();
  const apiSegment = api ? ` | API ${api}` : " | API …";
  item.text = `$(github) Stealth: ${owner}/${repo} | ${formatBytes(used)}/${formatBytes(max)}${apiSegment}${pinned}`;

  const mode = active.config.lazyTree ? "lazy tree" : `${count} files indexed`;
  const quota = getRateLimitState();
  const apiLine = quota
    ? `\n${formatRateLimitTooltip()}`
    : "\nSign in to GitHub to see API quota.";
  item.tooltip = `${mode} on ${branch}${apiLine}${active.config.cachePinned ? "\nCache pinned for this workspace" : ""}\nClick for Stealth Dashboard`;
  item.show();
  refreshDashboardIfOpen();
}
