import * as fs from "fs/promises";
import * as vscode from "vscode";
import {
  RepoRef,
  StealthWorkspaceConfig,
  workspaceId,
} from "@stealth/shared";
import { RepoIndex } from "@stealth/shared";
import { saveIndex } from "../index/store";
import { workspaceRoot } from "../paths";
import { writeWorkspaceConfig } from "./config";
import { computeWorkspaceFlags } from "./flags";
import { syncExplorerStubs } from "../explorer/stubSync";

export async function prepareWorkspace(
  repo: RepoRef,
  index: RepoIndex
): Promise<{ config: StealthWorkspaceConfig; root: string }> {
  const indexPath = await saveIndex(index);
  const flags = computeWorkspaceFlags(index);
  const root = workspaceRoot(repo);
  await fs.mkdir(root, { recursive: true });

  const config: StealthWorkspaceConfig = {
    version: 1,
    repo,
    treeSha: index.treeSha,
    workspaceId: workspaceId(repo),
    indexPath,
    openedAt: new Date().toISOString(),
    lazyTree: flags.lazyTree,
    explorerStubs: flags.explorerStubs,
    shallow: Boolean(index.shallow),
  };

  await writeWorkspaceConfig(root, config);

  if (flags.explorerStubs) {
    await syncExplorerStubs(root, index.entries);
  } else if (index.shallow) {
    void vscode.window.showInformationMessage(
      `Shallow index: expand folders in Remote Repository. Run "Deep Index" for a full file list.`
    );
  } else if (flags.lazyTree) {
    void vscode.window.showInformationMessage(
      `Large repo: using lazy tree (no Explorer stubs). Use Remote Repository or Browse Files. Indexed ${index.entries.length}${index.truncated ? "+" : ""} paths.`
    );
  }

  return { config, root };
}
