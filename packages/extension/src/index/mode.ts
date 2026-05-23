import * as vscode from "vscode";
import { IndexMode, RepoIndex } from "@stealth/shared";
import {
  fetchRepoIndex,
  fetchRepoIndexShallow,
} from "../github/client";

export function getConfiguredIndexMode(): IndexMode {
  const mode = vscode.workspace
    .getConfiguration("stealth")
    .get<string>("indexMode", "shallow");
  return mode === "full" ? "full" : "shallow";
}

export async function fetchIndexForMode(
  token: string,
  repo: import("@stealth/shared").RepoRef,
  mode: IndexMode
): Promise<RepoIndex> {
  return mode === "full"
    ? fetchRepoIndex(token, repo)
    : fetchRepoIndexShallow(token, repo);
}

export function indexModeForWorkspace(index: RepoIndex): IndexMode {
  return index.shallow ? "shallow" : "full";
}
