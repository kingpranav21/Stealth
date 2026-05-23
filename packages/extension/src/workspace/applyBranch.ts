import * as vscode from "vscode";
import { RepoRef } from "@stealth/shared";
import { fetchRepoIndex } from "../github/client";
import { reloadStealthWorkspace } from "./reload";
import { prepareWorkspace } from "./setupRepo";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function applyRepoBranch(
  repo: RepoRef,
  treeProvider: RemoteTreeProvider,
  token: string
): Promise<void> {
  const index = await fetchRepoIndex(token, repo);
  const { root } = await prepareWorkspace(repo, index);

  const uri = vscode.Uri.file(root);
  const alreadyOpen = vscode.workspace.workspaceFolders?.some(
    (f) => f.uri.fsPath === uri.fsPath
  );

  if (alreadyOpen) {
    await reloadStealthWorkspace(treeProvider);
  } else {
    await vscode.commands.executeCommand("vscode.openFolder", uri, {
      forceNewWindow: false,
    });
  }
}
