import * as vscode from "vscode";
import { RepoRef } from "@stealth/shared";
import {
  createBranch,
  GitHubApiError,
  listBranches,
} from "../github/client";
import { getGitHubToken } from "../auth";
import { getActiveStealthConfig } from "../workspace/config";
import { applyRepoBranch } from "../workspace/applyBranch";
import { addRecentRepo } from "../recentRepos";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

const BRANCH_NAME_RE = /^[a-zA-Z0-9._\-/]+$/;

function validateBranchName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Enter a branch name";
  }
  if (trimmed.startsWith("/") || trimmed.endsWith("/")) {
    return "Branch name cannot start or end with /";
  }
  if (trimmed.includes("..") || trimmed.includes("//")) {
    return "Invalid branch name";
  }
  if (!BRANCH_NAME_RE.test(trimmed)) {
    return "Use letters, numbers, -, _, ., and / only";
  }
  return undefined;
}

export async function switchGitHubBranch(
  context: vscode.ExtensionContext,
  treeProvider: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage(
      "Open a Stealth workspace first (Stealth: Open GitHub Repository…)."
    );
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  const { owner, repo, branch: current } = active.config.repo;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Loading branches",
    },
    async () => {
      try {
        const branches = await listBranches(token, owner, repo);
        if (!branches.length) {
          void vscode.window.showWarningMessage("No branches found.");
          return;
        }

        const pick = await vscode.window.showQuickPick(
          branches.map((b) => ({
            label: b.name,
            description: b.name === current ? "current" : undefined,
            picked: b.name === current,
            branch: b.name,
          })),
          {
            title: `${owner}/${repo}`,
            placeHolder: `Current: ${current}`,
          }
        );

        if (!pick || pick.branch === current) {
          return;
        }

        const repoRef: RepoRef = {
          owner,
          repo,
          branch: pick.branch,
        };

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Switching to ${pick.branch}`,
          },
          async () => {
            await applyRepoBranch(repoRef, treeProvider, token);
            await addRecentRepo(context, repoRef);
          }
        );

        void vscode.window.showInformationMessage(
          `Stealth: now on branch ${pick.branch} (${owner}/${repo}).`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Could not switch branch: ${msg}`);
      }
    }
  );
}

export async function createGitHubBranch(
  context: vscode.ExtensionContext,
  treeProvider: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showWarningMessage(
      "Open a Stealth workspace first (Stealth: Open GitHub Repository…)."
    );
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  const { owner, repo, branch: current } = active.config.repo;

  const newName = await vscode.window.showInputBox({
    title: "Create branch on GitHub",
    prompt: `New branch from "${current}"`,
    placeHolder: "feature/my-change",
    validateInput: validateBranchName,
  });

  if (!newName) {
    return;
  }

  const branchName = newName.trim();

  const fromPick = await vscode.window.showQuickPick(
    [
      {
        label: `From current branch (${current})`,
        from: current,
      },
      {
        label: "From another branch…",
        from: "__other__",
      },
    ],
    { title: "Base branch" }
  );

  if (!fromPick) {
    return;
  }

  let fromBranch = current;
  if (fromPick.from === "__other__") {
    const branches = await listBranches(token, owner, repo);
    const base = await vscode.window.showQuickPick(
      branches.map((b) => ({ label: b.name, branch: b.name })),
      { title: "Base branch" }
    );
    if (!base) {
      return;
    }
    fromBranch = base.branch;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Creating branch ${branchName}`,
    },
    async () => {
      try {
        await createBranch(token, owner, repo, branchName, fromBranch);

        const repoRef: RepoRef = { owner, repo, branch: branchName };
        await applyRepoBranch(repoRef, treeProvider, token);
        await addRecentRepo(context, repoRef);

        void vscode.window.showInformationMessage(
          `Created and switched to branch ${branchName} (from ${fromBranch}).`
        );
      } catch (err) {
        const msg =
          err instanceof GitHubApiError ? err.message : String(err);
        void vscode.window.showErrorMessage(`Could not create branch: ${msg}`);
      }
    }
  );
}
