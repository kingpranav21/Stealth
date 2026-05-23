import * as vscode from "vscode";
import { getActiveStealthConfig } from "../workspace/config";
import type { RemoteTreeProvider } from "../tree/remoteTreeProvider";

export async function showStealthHub(
  context: vscode.ExtensionContext,
  _treeProvider: RemoteTreeProvider
): Promise<void> {
  const active = await getActiveStealthConfig();
  const repoLabel = active
    ? `${active.config.repo.owner}/${active.config.repo.repo}@${active.config.repo.branch}`
    : "No workspace";

  const items: vscode.QuickPickItem[] = [
    { label: "$(dashboard) Stealth Dashboard", description: "Disk, API, Stub Guard" },
    { label: "$(repo) Open GitHub Repository…" },
    { label: "$(folder-opened) Switch Stealth Workspace…", description: "Recent ~/.stealth workspaces" },
  ];

  if (active) {
    items.push(
      { label: "$(search) Find File…", description: "Search paths without deep index" },
      { label: "$(cloud) Open in GitHub Codespace…", description: repoLabel },
      { label: "$(globe) Open on GitHub.com", description: "Repo or active file" },
      { label: "$(edit) Open in github.dev", description: "Browser editor" },
      { label: "$(git-pull-request) Create Pull Request…" },
      { label: "$(list-unordered) Pull Requests on GitHub" },
      { label: "$(diff) Compare with GitHub (active file)" },
      { label: "$(cloud-download) Pull from GitHub (active file)" },
      { label: "$(git-branch) Switch Branch…", description: repoLabel },
      { label: "$(add) Create Branch…" },
      { label: "$(git-commit) Recent Commits on Branch" },
      { label: "$(file-add) New Remote File…" },
      { label: "$(history) File History (active file)" },
      { label: "$(git-commit) File Blame (active file)" },
      { label: "$(list-tree) Deep Index (full tree)…" },
      { label: "$(dashboard) Disk Governor (all repos)…", description: "Mac-wide ~/.stealth budget" },
      { label: "$(database) Cache & disk usage…" },
      { label: "$(clippy) Copy file for AI (hydrated)", description: "Avoid pasting stub text into chat" },
      { label: "$(refresh) Refresh Remote Index" }
    );
  }

  items.push({ label: "$(sign-in) Sign in to GitHub" });

  const pick = await vscode.window.showQuickPick(items, {
    title: "Stealth",
    placeHolder: repoLabel,
  });
  if (!pick) {
    return;
  }

  const map: Record<string, string> = {
    "Stealth Dashboard": "stealth.dashboard",
    "Open GitHub": "stealth.openRepository",
    "Switch Stealth": "stealth.switchWorkspace",
    "Find File": "stealth.findFile",
    "Codespace": "stealth.openInCodespace",
    "GitHub.com": "stealth.openOnGitHub",
    "github.dev": "stealth.openInGithubDev",
    "Create Pull Request": "stealth.createPullRequest",
    "Pull Requests on": "stealth.openPullRequests",
    "Compare with": "stealth.compareWithRemote",
    "Pull from": "stealth.pullFromGitHub",
    "Switch Branch": "stealth.switchBranch",
    "Create Branch": "stealth.createBranch",
    "Recent Commits": "stealth.recentCommits",
    "New Remote": "stealth.newRemoteFile",
    "File History": "stealth.fileHistory",
    "File Blame": "stealth.fileBlame",
    "Deep Index": "stealth.deepIndex",
    "Disk Governor": "stealth.diskGovernor",
    "Cache": "stealth.cacheActions",
    "Copy file for AI": "stealth.copyForAi",
    "Refresh Remote": "stealth.refreshIndex",
    "Sign in": "stealth.signIn",
  };

  for (const [key, cmd] of Object.entries(map)) {
    if (pick.label.includes(key)) {
      if (cmd === "stealth.openRepository") {
        const { openGitHubRepository } = await import("./openRepository");
        await openGitHubRepository(context, _treeProvider);
      } else {
        await vscode.commands.executeCommand(cmd);
      }
      return;
    }
  }
}
