import * as vscode from "vscode";
import { getRepository, GitHubApiError } from "../github/client";
import { createPullRequestUrl } from "../github/links";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";

/**
 * Open GitHub compare view (base ← head) so the user can open a PR in the browser.
 */
export async function createPullRequest(): Promise<void> {
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
    { location: vscode.ProgressLocation.Notification, title: "Opening PR compare" },
    async () => {
      try {
        const meta = await getRepository(token, repo.owner, repo.repo);
        const base = meta.default_branch;

        if (repo.branch === base) {
          const choice = await vscode.window.showWarningMessage(
            `You are on the default branch (${base}). Create a feature branch first, or compare against another base.`,
            "Create Branch…",
            "Compare anyway"
          );
          if (choice === "Create Branch…") {
            await vscode.commands.executeCommand("stealth.createBranch");
            return;
          }
          if (choice !== "Compare anyway") {
            return;
          }
        }

        const url = createPullRequestUrl(repo, base);
        await vscode.env.openExternal(vscode.Uri.parse(url));
        void vscode.window.showInformationMessage(
          `Opened compare: ${base} ← ${repo.branch}. Finish the PR on GitHub.`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Create PR failed: ${msg}`);
      }
    }
  );
}
