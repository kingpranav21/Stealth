import type { RepoRef } from "@stealth/shared";

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
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = `GitHub API ${res.status}`;
    try {
      const body = JSON.parse(text) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // keep default
    }
    throw new GitHubApiError(message, res.status, text.slice(0, 500));
  }
  return JSON.parse(text) as T;
}

export interface RepositoryMeta {
  default_branch: string;
  permissions?: { push?: boolean };
}

export async function getRepository(
  token: string,
  owner: string,
  repo: string
): Promise<RepositoryMeta> {
  return parseJson(await githubFetch(token, repoPath(owner, repo)));
}

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
      `Branch "${repo.branch}" not found on ${repo.owner}/${repo.repo}.`,
      404
    );
  }
  return { ...repo, branch: meta.default_branch };
}

export function encodeContentPath(filePath: string): string {
  return filePath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

export async function getRemoteFileSha(
  token: string,
  repo: RepoRef,
  filePath: string
): Promise<string | undefined> {
  const url = `${repoPath(repo.owner, repo.repo)}/contents/${encodeContentPath(filePath)}?ref=${encodeURIComponent(repo.branch)}`;
  try {
    const data = await parseJson<{ sha: string }>(await githubFetch(token, url));
    return data.sha;
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 404) {
      return undefined;
    }
    throw err;
  }
}

export interface PutFileResult {
  contentSha: string;
  commitSha: string;
}

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
      "File changed on GitHub. Pull or reload, then push again.",
      409
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

export async function githubFetchUser(token: string): Promise<string> {
  const data = await parseJson<{ login: string }>(
    await githubFetch(token, "/user")
  );
  return data.login;
}

export async function fetchFileText(
  token: string,
  repo: RepoRef,
  filePath: string
): Promise<string> {
  const url = `${repoPath(repo.owner, repo.repo)}/contents/${encodeContentPath(filePath)}?ref=${encodeURIComponent(repo.branch)}`;
  const data = await parseJson<{
    content?: string;
    encoding?: string;
  }>(await githubFetch(token, url));
  if (!data.content || data.encoding !== "base64") {
    throw new GitHubApiError(`Cannot read ${filePath} as text.`, 400);
  }
  return Buffer.from(data.content, "base64").toString("utf-8");
}
