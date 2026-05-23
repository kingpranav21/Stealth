import * as os from "os";
import * as path from "path";
import { RepoRef, workspaceId } from "@stealth/shared";

export function stealthHome(): string {
  return path.join(os.homedir(), ".stealth");
}

export function indexesDir(): string {
  return path.join(stealthHome(), "indexes");
}

export function workspacesDir(): string {
  return path.join(stealthHome(), "workspaces");
}

export function indexFilePath(repo: RepoRef): string {
  return path.join(indexesDir(), `${workspaceId(repo)}.json`);
}

export function workspaceRoot(repo: RepoRef): string {
  return path.join(workspacesDir(), workspaceId(repo));
}
