import * as vscode from "vscode";
import { GitHubApiError, listRecentCommits } from "../github/client";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";

/** Recent commits on the current branch (repo log without clone). */
export async function showRecentCommits(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage("No Stealth workspace open.");
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  const { repo } = active.config;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Loading commits",
    },
    async () => {
      try {
        const commits = await listRecentCommits(token, repo);
        if (!commits.length) {
          void vscode.window.showInformationMessage(
            `No commits on ${repo.branch}.`
          );
          return;
        }

        const pick = await vscode.window.showQuickPick(
          commits.map((c) => ({
            label: `$(git-commit) ${c.shortSha}`,
            description: c.author,
            detail: `${c.message} · ${c.date.slice(0, 10)}`,
            commit: c,
          })),
          {
            title: `${repo.owner}/${repo.repo} @ ${repo.branch}`,
            placeHolder: "Recent commits — open on GitHub",
          }
        );

        if (pick) {
          await vscode.env.openExternal(vscode.Uri.parse(pick.commit.url));
        }
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Commits failed: ${msg}`);
      }
    }
  );
}
