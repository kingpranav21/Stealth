import * as vscode from "vscode";
import { RepoRef } from "@stealth/shared";
import { getActiveStealthConfig } from "../workspace/config";

/** Opens GitHub's "create Codespace" page for the current (or given) repo. */
export function codespaceUrl(repo: RepoRef): string {
  const slug = `${repo.owner}/${repo.repo}`;
  const params = new URLSearchParams({
    repo: slug,
    ref: repo.branch,
  });
  return `https://github.com/codespaces/new?${params.toString()}`;
}

export async function openInCodespace(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage(
      "Open a Stealth workspace first, or use Stealth: Open GitHub Repository…"
    );
    return;
  }

  const url = codespaceUrl(active.config.repo);
  const open = await vscode.window.showInformationMessage(
    `Open ${active.config.repo.owner}/${active.config.repo.repo} in a GitHub Codespace?`,
    "Open in browser",
    "Copy link"
  );

  if (open === "Open in browser") {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  } else if (open === "Copy link") {
    await vscode.env.clipboard.writeText(url);
    void vscode.window.showInformationMessage("Codespace URL copied.");
  }
}
