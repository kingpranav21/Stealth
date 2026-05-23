import { RepoRef } from "@stealth/shared";

export function githubRepoUrl(repo: RepoRef): string {
  return `https://github.com/${repo.owner}/${repo.repo}/tree/${encodeURIComponent(repo.branch)}`;
}

export function githubBlobUrl(repo: RepoRef, filePath: string): string {
  const path = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${encodeURIComponent(repo.branch)}/${path}`;
}

/** Browser editor at github.dev (no clone). */
/** Open GitHub compare to start a PR: base...head */
export function createPullRequestUrl(
  repo: RepoRef,
  baseBranch: string,
  headBranch?: string
): string {
  const head = headBranch ?? repo.branch;
  const base = encodeURIComponent(baseBranch);
  const headEnc = encodeURIComponent(head);
  return `https://github.com/${repo.owner}/${repo.repo}/compare/${base}...${headEnc}?expand=1`;
}

export function githubDevUrl(repo: RepoRef, filePath?: string): string {
  if (!filePath) {
    return `https://github.dev/${repo.owner}/${repo.repo}/tree/${encodeURIComponent(repo.branch)}`;
  }
  const path = filePath.split("/").map(encodeURIComponent).join("/");
  return `https://github.dev/${repo.owner}/${repo.repo}/blob/${encodeURIComponent(repo.branch)}/${path}`;
}
