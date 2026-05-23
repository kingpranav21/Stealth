import * as vscode from "vscode";
import { RecentRepo, RepoRef } from "@stealth/shared";

const KEY = "stealth.recentRepos";
const MAX = 12;

export async function addRecentRepo(
  context: vscode.ExtensionContext,
  repo: RepoRef
): Promise<void> {
  const list = context.globalState.get<RecentRepo[]>(KEY, []);
  const id = `${repo.owner}/${repo.repo}@${repo.branch}`;
  const filtered = list.filter(
    (r) => `${r.owner}/${r.repo}@${r.branch}` !== id
  );
  filtered.unshift({
    owner: repo.owner,
    repo: repo.repo,
    branch: repo.branch,
    lastOpened: new Date().toISOString(),
  });
  await context.globalState.update(KEY, filtered.slice(0, MAX));
}

export function getRecentRepos(
  context: vscode.ExtensionContext
): RecentRepo[] {
  return context.globalState.get<RecentRepo[]>(KEY, []);
}

export function recentToRepoRef(r: RecentRepo): RepoRef {
  return { owner: r.owner, repo: r.repo, branch: r.branch };
}
