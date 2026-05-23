import * as vscode from "vscode";
import {
  RepoRef,
  RepoIndex,
  StealthWorkspaceConfig,
  workspaceId,
} from "@stealth/shared";
import { saveIndex } from "../index/store";
import { syncExplorerStubs } from "../explorer/stubSync";
import { writeWorkspaceConfig, readWorkspaceConfig } from "./config";
import { computeWorkspaceFlags } from "./flags";

/** After refresh or deep index: persist index + update workspace flags. */
export async function applyIndexToWorkspace(
  workspaceRoot: string,
  repo: RepoRef,
  index: RepoIndex
): Promise<StealthWorkspaceConfig> {
  const indexPath = await saveIndex(index);
  const flags = computeWorkspaceFlags(index);
  const existing = await readWorkspaceConfig(vscode.Uri.file(workspaceRoot));

  const config: StealthWorkspaceConfig = {
    version: 1,
    repo,
    treeSha: index.treeSha,
    workspaceId: existing?.workspaceId ?? workspaceId(repo),
    indexPath,
    openedAt: existing?.openedAt ?? new Date().toISOString(),
    lazyTree: flags.lazyTree,
    explorerStubs: flags.explorerStubs,
    shallow: Boolean(index.shallow),
  };

  await writeWorkspaceConfig(workspaceRoot, config);

  if (flags.explorerStubs) {
    await syncExplorerStubs(workspaceRoot, index.entries);
  }

  return config;
}
