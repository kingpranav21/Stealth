import * as fs from "fs/promises";
import * as path from "path";
import type { RepoRef } from "@stealth/shared";
import {
  getRemoteFileSha,
  getRepository,
  putFileContent,
  resolveBranch,
} from "./github";
import {
  normalizeRelativePath,
  readWorkspaceFile,
  setFileSha,
  WorkspaceContext,
} from "./workspace";

export async function pushFileToGitHub(
  token: string,
  ws: WorkspaceContext,
  relativePath: string,
  options?: { message?: string; content?: Buffer }
): Promise<void> {
  const relative = normalizeRelativePath(ws.root, relativePath);
  const content =
    options?.content ?? (await readWorkspaceFile(ws.root, relative));

  const meta = await getRepository(
    token,
    ws.config.repo.owner,
    ws.config.repo.repo
  );
  if (meta.permissions?.push === false) {
    throw new Error(
      `No push access to ${ws.config.repo.owner}/${ws.config.repo.repo}.`
    );
  }

  let repoRef: RepoRef = await resolveBranch(token, ws.config.repo);
  const remoteSha = await getRemoteFileSha(token, repoRef, relative);
  const message =
    options?.message ?? `Update ${relative} via Stealth CLI`;

  const result = await putFileContent(token, repoRef, relative, content, {
    message,
    sha: remoteSha,
  });

  await setFileSha(ws.root, relative, result.contentSha);

  const short = result.commitSha.slice(0, 7);
  console.log(
    `pushed ${relative} → ${repoRef.owner}/${repoRef.repo}@${repoRef.branch} (${short})`
  );
}

export async function writeAndPush(
  token: string,
  ws: WorkspaceContext,
  relativePath: string,
  content: Buffer,
  message?: string
): Promise<void> {
  const relative = normalizeRelativePath(ws.root, relativePath);
  const full = path.join(ws.root, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content);
  await pushFileToGitHub(token, ws, relative, { message, content });
}
