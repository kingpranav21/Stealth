import { IndexEntry, RepoIndex, RepoRef } from "@stealth/shared";
import { recordRateLimit, setCoreRateLimit } from "./rateLimit";
import {
  assertQuotaOrThrow,
  confirmIfLowQuota,
} from "./rateLimitGuard";

const API = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

async function githubFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  if (!path.startsWith("/rate_limit")) {
    const ok = await confirmIfLowQuota("this GitHub request");
    assertQuotaOrThrow(ok);
  }

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  recordRateLimit(res.headers);
  void import("../statusBar").then((m) => m.requestStatusBarUpdate());
  return res;
}

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

function errorFromResponse(res: Response, text: string): GitHubApiError {
  let message = `GitHub API ${res.status}`;
  try {
    const body = JSON.parse(text) as { message?: string };
    if (body.message) {
      message = body.message;
    }
  } catch {
    // keep default
  }
  return new GitHubApiError(message, res.status, text.slice(0, 500));
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw errorFromResponse(res, text);
  }
  return JSON.parse(text) as T;
}

export interface RepositoryMeta {
  default_branch: string;
  private: boolean;
  permissions?: { push?: boolean; admin?: boolean };
}

export async function getRepository(
  token: string,
  owner: string,
  repo: string
): Promise<RepositoryMeta> {
  return parseJson(await githubFetch(token, repoPath(owner, repo)));
}

/** Fetch quota explicitly (also updates status bar via response headers). */
export async function refreshGitHubRateLimit(token: string): Promise<void> {
  const data = await parseJson<{
    resources: { core: { limit: number; remaining: number; reset: number } };
  }>(await githubFetch(token, "/rate_limit"));
  const core = data.resources.core;
  setCoreRateLimit(core.limit, core.remaining, core.reset);
}

/** Use default_branch if the configured branch ref does not exist. */
export async function resolveBranch(
  token: string,
  repo: RepoRef
): Promise<RepoRef> {
  const refUrl = `${repoPath(repo.owner, repo.repo)}/git/ref/heads/${encodeURIComponent(repo.branch)}`;
  try {
    await parseJson(await githubFetch(token, refUrl));
    return repo;
  } catch (err) {
    if (!(err instanceof GitHubApiError) || err.status !== 404) {
      throw err;
    }
  }

  const meta = await getRepository(token, repo.owner, repo.repo);
  if (meta.default_branch === repo.branch) {
    throw new GitHubApiError(
      `Branch "${repo.branch}" was not found on ${repo.owner}/${repo.repo}.`,
      404
    );
  }

  return { ...repo, branch: meta.default_branch };
}

/** Blob SHA for updating an existing file, or undefined to create. */
export async function getRemoteFileSha(
  token: string,
  repo: RepoRef,
  filePath: string
): Promise<string | undefined> {
  try {
    const file = await fetchFileContent(token, repo, filePath);
    return file.sha;
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      return undefined;
    }
    throw err;
  }
}

export interface BranchInfo {
  name: string;
  commitSha: string;
}

export async function listBranches(
  token: string,
  owner: string,
  repo: string
): Promise<BranchInfo[]> {
  const branches: BranchInfo[] = [];
  let page = 1;

  while (page <= 10) {
    const batch = await parseJson<
      Array<{ name: string; commit: { sha: string } }>
    >(
      await githubFetch(
        token,
        `${repoPath(owner, repo)}/branches?per_page=100&page=${page}`
      )
    );
    if (!batch.length) {
      break;
    }
    for (const b of batch) {
      branches.push({ name: b.name, commitSha: b.commit.sha });
    }
    if (batch.length < 100) {
      break;
    }
    page++;
  }

  return branches.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBranchCommitSha(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<string> {
  const ref = await parseJson<{ object: { sha: string } }>(
    await githubFetch(
      token,
      `${repoPath(owner, repo)}/git/ref/heads/${encodeURIComponent(branch)}`
    )
  );
  return ref.object.sha;
}

/** Create a new branch pointing at the tip of `fromBranch`. */
export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  newBranch: string,
  fromBranch: string
): Promise<BranchInfo> {
  const sha = await getBranchCommitSha(token, owner, repo, fromBranch);
  const ref = `refs/heads/${newBranch}`;

  try {
    await parseJson(
      await githubFetch(token, `${repoPath(owner, repo)}/git/refs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, sha }),
      })
    );
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 422) {
      throw new GitHubApiError(
        `Branch "${newBranch}" already exists on ${owner}/${repo}.`,
        422
      );
    }
    throw err;
  }

  return { name: newBranch, commitSha: sha };
}

export interface DirectoryEntry {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

/** List immediate children of a directory (empty path = repo root). */
export async function listDirectory(
  token: string,
  repo: RepoRef,
  dirPath: string
): Promise<DirectoryEntry[]> {
  const encoded = dirPath
    ? encodeContentPath(dirPath)
    : "";
  const url = encoded
    ? `${repoPath(repo.owner, repo.repo)}/contents/${encoded}?ref=${encodeURIComponent(repo.branch)}`
    : `${repoPath(repo.owner, repo.repo)}/contents?ref=${encodeURIComponent(repo.branch)}`;

  const data = await parseJson<
    | Array<{
        name: string;
        path: string;
        sha: string;
        type: "file" | "dir";
      }>
    | {
        name: string;
        path: string;
        sha: string;
        type: "file" | "dir";
      }
  >(await githubFetch(token, url));

  const items = Array.isArray(data) ? data : [data];
  return items.map((item) => ({
    name: item.name,
    path: item.path,
    sha: item.sha,
    type: item.type === "dir" ? "dir" : "file",
  }));
}

/** Index only the root tree (one API call). Folders load on expand via lazy tree. */
export async function fetchRepoIndexShallow(
  token: string,
  repo: RepoRef
): Promise<RepoIndex> {
  const refRes = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/git/ref/heads/${encodeURIComponent(repo.branch)}`
  );
  const ref = await parseJson<{ object: { sha: string } }>(refRes);

  const treeRes = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/git/trees/${ref.object.sha}`
  );
  const tree = await parseJson<{
    sha: string;
    tree: Array<{
      path: string;
      type: "blob" | "tree";
      sha: string;
      size?: number;
    }>;
  }>(treeRes);

  const entries: IndexEntry[] = tree.tree
    .filter((e) => e.type === "blob")
    .map((e) => ({
      path: e.path,
      sha: e.sha,
      size: e.size,
      type: e.type,
    }));

  return {
    repo,
    treeSha: tree.sha,
    truncated: false,
    shallow: true,
    fetchedAt: new Date().toISOString(),
    entries,
  };
}

export async function fetchRepoIndex(
  token: string,
  repo: RepoRef
): Promise<RepoIndex> {
  const refRes = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/git/ref/heads/${encodeURIComponent(repo.branch)}`
  );
  const ref = await parseJson<{ object: { sha: string } }>(refRes);

  const treeRes = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/git/trees/${ref.object.sha}?recursive=1`
  );
  const tree = await parseJson<{
    sha: string;
    truncated: boolean;
    tree: Array<{
      path: string;
      mode: string;
      type: "blob" | "tree";
      sha: string;
      size?: number;
    }>;
  }>(treeRes);

  const entries: IndexEntry[] = tree.tree
    .filter((e) => e.type === "blob")
    .map((e) => ({
      path: e.path,
      sha: e.sha,
      size: e.size,
      type: e.type,
    }));

  return {
    repo,
    treeSha: tree.sha,
    truncated: tree.truncated,
    shallow: false,
    fetchedAt: new Date().toISOString(),
    entries,
  };
}

export interface CommitSummary {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

type CommitRow = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string | null; date: string | null };
  };
};

function mapCommitRow(c: CommitRow): CommitSummary {
  return {
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0] ?? c.commit.message,
    author: c.commit.author.name ?? "Unknown",
    date: c.commit.author.date ?? "",
    url: c.html_url,
  };
}

/** Recent commits on the branch (no local git). */
export async function listRecentCommits(
  token: string,
  repo: RepoRef,
  perPage = 25
): Promise<CommitSummary[]> {
  const q = new URLSearchParams({
    sha: repo.branch,
    per_page: String(perPage),
  });
  const batch = await parseJson<CommitRow[]>(
    await githubFetch(
      token,
      `${repoPath(repo.owner, repo.repo)}/commits?${q.toString()}`
    )
  );
  return batch.map(mapCommitRow);
}

/** Recent commits that touched a file (no local git). */
export async function listCommitsForPath(
  token: string,
  repo: RepoRef,
  filePath: string,
  perPage = 25
): Promise<CommitSummary[]> {
  const q = new URLSearchParams({
    sha: repo.branch,
    path: filePath,
    per_page: String(perPage),
  });
  const batch = await parseJson<CommitRow[]>(
    await githubFetch(
      token,
      `${repoPath(repo.owner, repo.repo)}/commits?${q.toString()}`
    )
  );
  return batch.map(mapCommitRow);
}

export interface CodeSearchHit {
  path: string;
  sha: string;
}

/** Search file paths in a repo (works without deep index). */
export async function searchCodeInRepo(
  token: string,
  repo: RepoRef,
  query: string,
  perPage = 30
): Promise<CodeSearchHit[]> {
  const q = `${query.trim()} repo:${repo.owner}/${repo.repo}`;
  const data = await parseJson<{
    items: Array<{ path: string; sha: string }>;
  }>(
    await githubFetch(
      token,
      `/search/code?${new URLSearchParams({ q, per_page: String(perPage) })}`
    )
  );
  const seen = new Set<string>();
  const hits: CodeSearchHit[] = [];
  for (const item of data.items) {
    if (!seen.has(item.path)) {
      seen.add(item.path);
      hits.push({ path: item.path, sha: item.sha });
    }
  }
  return hits;
}

export interface BlameRange {
  startingLine: number;
  endingLine: number;
  author: string;
  date: string;
  shortSha: string;
  headline: string;
}

/** Line-level blame via GitHub GraphQL (no clone). */
export async function fetchBlameForFile(
  token: string,
  repo: RepoRef,
  filePath: string
): Promise<BlameRange[]> {
  const query = `
    query($owner: String!, $name: String!, $expression: String!) {
      repository(owner: $owner, name: $name) {
        object(expression: $expression) {
          ... on Blob {
            blame {
              ranges {
                startingLine
                endingLine
                commit {
                  oid
                  committedDate
                  messageHeadline
                  author { name }
                }
              }
            }
          }
        }
      }
    }
  `;

  const expression = `${repo.branch}:${filePath}`;
  const data = await githubGraphql<{
    repository: {
      object: {
        blame: {
          ranges: Array<{
            startingLine: number;
            endingLine: number;
            commit: {
              oid: string;
              committedDate: string;
              messageHeadline: string;
              author: { name: string | null };
            };
          }>;
        };
      } | null;
    } | null;
  }>(token, query, {
    owner: repo.owner,
    name: repo.repo,
    expression,
  });

  const ranges = data.repository?.object?.blame?.ranges;
  if (!ranges) {
    throw new GitHubApiError(
      `Could not load blame for ${filePath} on ${repo.branch}.`,
      404
    );
  }

  return ranges.map((r) => ({
    startingLine: r.startingLine,
    endingLine: r.endingLine,
    author: r.commit.author.name ?? "Unknown",
    date: r.commit.committedDate,
    shortSha: r.commit.oid.slice(0, 7),
    headline: r.commit.messageHeadline,
  }));
}

async function githubGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, string>
): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  recordRateLimit(res.headers);
  const text = await res.text();
  const body = JSON.parse(text) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };
  if (!res.ok || body.errors?.length) {
    const msg = body.errors?.map((e) => e.message).join("; ") ?? text.slice(0, 200);
    throw new GitHubApiError(msg || `GraphQL ${res.status}`, res.status, text);
  }
  if (!body.data) {
    throw new GitHubApiError("Empty GraphQL response", res.status, text);
  }
  return body.data;
}

export interface FileContent {
  content: Buffer;
  encoding: "utf-8" | "binary";
  sha: string;
}

const MAX_DOWNLOAD_BYTES = 5 * 1024 * 1024;

export async function fetchFileContent(
  token: string,
  repo: RepoRef,
  filePath: string
): Promise<FileContent> {
  const res = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/contents/${encodeContentPath(filePath)}?ref=${encodeURIComponent(repo.branch)}`
  );
  const data = await parseJson<{
    sha: string;
    size: number;
    content?: string;
    encoding?: string;
  }>(res);

  if (data.size > MAX_DOWNLOAD_BYTES) {
    throw new GitHubApiError(
      `File is larger than ${MAX_DOWNLOAD_BYTES / 1024 / 1024} MB`,
      413
    );
  }

  if (!data.content) {
    throw new GitHubApiError("Empty or unsupported file content", 422);
  }

  const raw = Buffer.from(data.content, "base64");
  const looksBinary = raw.includes(0);
  return {
    content: raw,
    encoding: looksBinary ? "binary" : "utf-8",
    sha: data.sha,
  };
}

export interface PutFileResult {
  contentSha: string;
  commitSha: string;
}

export function encodeContentPath(filePath: string): string {
  return filePath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

/** Create or update a file on GitHub (Contents API). */
export async function putFileContent(
  token: string,
  repo: RepoRef,
  filePath: string,
  content: Buffer,
  options: { message: string; sha?: string }
): Promise<PutFileResult> {
  const body: Record<string, string> = {
    message: options.message,
    content: content.toString("base64"),
    branch: repo.branch,
  };
  if (options.sha) {
    body.sha = options.sha;
  }

  const res = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/contents/${encodeContentPath(filePath)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 409) {
    throw new GitHubApiError(
      "File was modified on GitHub. Reload the file, then save again.",
      409
    );
  }

  if (res.status === 404) {
    const text = await res.text();
    throw new GitHubApiError(
      `Cannot save to ${repo.owner}/${repo.repo} on branch "${repo.branch}". ` +
        `Use a repo you can push to (your fork), confirm the branch name, and that the file path "${filePath}" exists or is being created. ` +
        `GitHub: ${tryParseMessage(text)}`,
      404,
      text.slice(0, 500)
    );
  }

  const data = await parseJson<{
    content: { sha: string };
    commit: { sha: string };
  }>(res);

  return {
    contentSha: data.content.sha,
    commitSha: data.commit.sha,
  };
}

/** Delete a file on GitHub. */
export async function deleteFileContent(
  token: string,
  repo: RepoRef,
  filePath: string,
  sha: string,
  message: string
): Promise<void> {
  const res = await githubFetch(
    token,
    `${repoPath(repo.owner, repo.repo)}/contents/${encodeContentPath(filePath)}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        sha,
        branch: repo.branch,
      }),
    }
  );

  if (res.status === 409) {
    throw new GitHubApiError(
      "File was modified on GitHub. Refresh the index, then try again.",
      409
    );
  }

  if (!res.ok) {
    const text = await res.text();
    throw errorFromResponse(res, text);
  }
}

function tryParseMessage(text: string): string {
  try {
    return (JSON.parse(text) as { message?: string }).message ?? text.slice(0, 120);
  } catch {
    return text.slice(0, 120);
  }
}
