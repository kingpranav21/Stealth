import * as vscode from "vscode";
import { parseRepoInput, RepoRef } from "@stealth/shared";
import { getGitHubToken } from "../auth";
import { getRepository, GitHubApiError } from "../github/client";
import { fetchIndexForMode, getConfiguredIndexMode } from "../index/mode";
import {
  addRecentRepo,
  getRecentRepos,
  recentToRepoRef,
} from "../recentRepos";
import { prepareWorkspace } from "../workspace/setupRepo";
import { reloadStealthWorkspace } from "../workspace/reload";
import { updateStatusBar } from "../statusBar";
import { focusRemoteFilesView } from "../tree/remoteTreeProvider";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function openRepoFlow(
  context: vscode.ExtensionContext,
  repo: RepoRef,
  token: string,
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  const index = await fetchIndexForMode(token, repo, getConfiguredIndexMode());
  const { root } = await prepareWorkspace(repo, index);
  await addRecentRepo(context, repo);

  const uri = vscode.Uri.file(root);
  const opened = vscode.workspace.workspaceFolders?.some(
    (f) => f.uri.fsPath === uri.fsPath
  );

  if (!opened) {
    await vscode.commands.executeCommand("vscode.openFolder", uri, {
      forceNewWindow: false,
    });
  } else if (treeProvider) {
    await reloadStealthWorkspace(treeProvider);
    await focusRemoteFilesView();
  }

  await updateStatusBar();

  const hint =
    index.entries.length === 1 ? ` File: ${index.entries[0].path}` : "";
  void vscode.window.showInformationMessage(
    `Stealth: ${repo.owner}/${repo.repo} @ ${repo.branch}${hint}`,
    "Browse files"
  ).then((choice) => {
    if (choice === "Browse files") {
      void vscode.commands.executeCommand("stealth.browseFiles");
    }
  });
}

export async function openGitHubRepository(
  context: vscode.ExtensionContext,
  treeProvider?: RemoteTreeProvider
): Promise<void> {
  const recent = getRecentRepos(context);
  const picks: vscode.QuickPickItem[] = recent.map((r) => ({
    label: `${r.owner}/${r.repo}`,
    description: r.branch,
    detail: "Recent",
  }));
  picks.push({
    label: "$(add) Enter repository…",
    description: "owner/repo",
  });

  const selected = await vscode.window.showQuickPick(picks, {
    title: "Open GitHub Repository",
    placeHolder: "Recent repos or enter a new one",
  });

  if (!selected) {
    return;
  }

  let repo: RepoRef | undefined;
  if (selected.label.includes("Enter repository")) {
    const input = await vscode.window.showInputBox({
      title: "GitHub repository",
      prompt: "owner/repo or https://github.com/owner/repo",
      placeHolder: "yourname/your-project",
      validateInput: (value) => {
        if (!parseRepoInput(value)) {
          return "Use owner/repo format";
        }
        return undefined;
      },
    });
    if (!input) {
      return;
    }
    repo = parseRepoInput(input)!;
  } else {
    const match = recent.find((r) => `${r.owner}/${r.repo}` === selected.label);
    if (match) {
      repo = recentToRepoRef(match);
    }
  }

  if (!repo) {
    return;
  }

  const token = await getGitHubToken(true);
  if (!token) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Opening repository with Stealth",
    },
    async () => {
      try {
        if (!repo!.branch) {
          const meta = await getRepository(token, repo!.owner, repo!.repo);
          repo = { ...repo!, branch: meta.default_branch };
        }
        await openRepoFlow(context, repo!, token, treeProvider);
      } catch (err) {
        const msg =
          err instanceof GitHubApiError
            ? `${err.message}${err.status === 401 ? " — try Stealth: Sign in to GitHub" : ""}`
            : String(err);
        void vscode.window.showErrorMessage(`Could not open repository: ${msg}`);
      }
    }
  );
}
