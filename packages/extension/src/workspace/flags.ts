import * as vscode from "vscode";
import { RepoIndex } from "@stealth/shared";

export function getMaxExplorerStubs(): number {
  return vscode.workspace
    .getConfiguration("stealth")
    .get<number>("maxExplorerStubs", 500);
}

export function computeWorkspaceFlags(index: RepoIndex): {
  lazyTree: boolean;
  explorerStubs: boolean;
} {
  if (index.shallow) {
    return { lazyTree: true, explorerStubs: false };
  }
  const maxStubs = getMaxExplorerStubs();
  const lazyTree = index.truncated || index.entries.length > maxStubs;
  const explorerStubs = !lazyTree && index.entries.length > 0;
  return { lazyTree, explorerStubs };
}
