import * as vscode from "vscode";
import {
  collectGlobalHydratedFiles,
  evictGlobalCacheIfNeeded,
  getGlobalCacheMaxBytes,
  totalGlobalBytes,
} from "../cache/global";
import { formatBytes } from "../cache/meta";
import { updateStatusBar } from "../statusBar";

/** Cross-repo disk budget — unique to Stealth. */
export async function showDiskGovernor(): Promise<void> {
  const rows = await collectGlobalHydratedFiles();
  const total = totalGlobalBytes(rows);
  const globalMax = getGlobalCacheMaxBytes();
  const globalLabel =
    globalMax > 0
      ? `${formatBytes(total)} / ${formatBytes(globalMax)} global cap`
      : `${formatBytes(total)} total (set stealth.globalCacheMaxMb to enable global cap)`;

  const byRepo = new Map<string, number>();
  for (const row of rows) {
    byRepo.set(row.repoLabel, (byRepo.get(row.repoLabel) ?? 0) + row.bytes);
  }

  const repoLines = [...byRepo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([repo, bytes]) => `${repo}: ${formatBytes(bytes)}`);

  const pick = await vscode.window.showQuickPick(
    [
      {
        label: "$(database) Global Stealth disk",
        description: globalLabel,
        detail: repoLines.join(" · ") || "No hydrated files yet",
      },
      {
        label: "$(trash) Evict globally (LRU across all repos)",
        description: "Demote oldest hydrated files in any workspace",
      },
      {
        label: "$(settings-gear) Open Settings",
        description: "stealth.globalCacheMaxMb, stealth.cacheMaxMb",
      },
    ],
    {
      title: "Stealth Disk Governor",
      placeHolder: "One budget for all ~/.stealth workspaces",
    }
  );

  if (!pick) {
    return;
  }

  if (pick.label.includes("Open Settings")) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "stealth.globalCacheMaxMb"
    );
    return;
  }

  if (pick.label.includes("Evict globally")) {
    if (globalMax <= 0) {
      const enable = await vscode.window.showWarningMessage(
        "Global cap is off. Set stealth.globalCacheMaxMb (e.g. 2048) to enforce a Mac-wide Stealth limit.",
        "Open Settings"
      );
      if (enable === "Open Settings") {
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "stealth.globalCacheMaxMb"
        );
      }
      return;
    }

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Global eviction",
      },
      () => evictGlobalCacheIfNeeded()
    );

    void vscode.window.showInformationMessage(
      `Global eviction: ${result.evicted} file(s), freed ${formatBytes(result.freedBytes)}. Now ${formatBytes(result.remainingBytes)} / ${formatBytes(globalMax)}.`
    );
    await updateStatusBar();
    await vscode.commands.executeCommand(
      "workbench.files.action.refreshFilesExplorer"
    );
  }
}
