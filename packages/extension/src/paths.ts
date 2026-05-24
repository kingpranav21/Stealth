export {
  stealthHome,
  indexesDir,
  workspacesDir,
  workspaceRoot,
} from "@stealth/shared";

// Legacy: indexFilePath used local workspaceId
import { RepoRef, workspaceId, indexesDir as indexes } from "@stealth/shared";
import * as path from "path";

export function indexFilePath(repo: RepoRef): string {
  return path.join(indexes(), `${workspaceId(repo)}.json`);
}
