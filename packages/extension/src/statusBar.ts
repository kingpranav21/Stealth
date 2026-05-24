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
import { getAccessState } from "./licensing/access";
import { getLicensingConfig } from "./licensing/config";

let item: vscode.StatusBarItem | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

export function createStatusBar(context: vscode.ExtensionContext): void {
  item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    200
  );
  item.name = "Stealth GitHub";
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

  const licenseSeg = await formatLicenseSegment();

  const active = await getActiveStealthConfig();
  if (!active) {
    item.text = `$(github) Stealth GitHub — open Dashboard${licenseSeg}`;
    item.tooltip = `No workspace open.\nClick for Dashboard or Open Repository.${licenseSeg ? `\n${licenseSeg.trim()}` : ""}`;
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
  item.text = `$(github) Stealth GitHub: ${owner}/${repo} | ${formatBytes(used)}/${formatBytes(max)}${apiSegment}${licenseSeg}${pinned}`;

  const mode = active.config.lazyTree ? "lazy tree" : `${count} files indexed`;
  const quota = getRateLimitState();
  const apiLine = quota
    ? `\n${formatRateLimitTooltip()}`
    : "\nSign in to GitHub to see API quota.";
  const licenseLine = licenseSeg ? `\n${licenseSeg.trim()}` : "";
  item.tooltip = `${mode} on ${branch}${apiLine}${licenseLine}${active.config.cachePinned ? "\nCache pinned for this workspace" : ""}\nClick for Dashboard`;
  item.show();
  refreshDashboardIfOpen();
}

async function formatLicenseSegment(): Promise<string> {
  if (!getLicensingConfig().enabled) {
    return "";
  }
  const state = await getAccessState();
  if (state.tier === "licensed") {
    return " | Pro";
  }
  if (state.tier === "trial" && state.daysLeft !== undefined) {
    return ` | Trial ${state.daysLeft}d`;
  }
  if (state.tier === "expired") {
    return " | Trial ended";
  }
  return "";
}
