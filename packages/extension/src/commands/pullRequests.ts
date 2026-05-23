import * as vscode from "vscode";
import { getActiveStealthConfig } from "../workspace/config";

export function pullRequestsUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/pulls`;
}

export async function openPullRequests(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const { owner, repo } = active.config.repo;
  await vscode.env.openExternal(
    vscode.Uri.parse(pullRequestsUrl(owner, repo))
  );
}
