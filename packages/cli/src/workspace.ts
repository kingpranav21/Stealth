import * as fs from "fs/promises";
import * as path from "path";
import {
  CONFIG_FILE,
  STEALTH_DIR,
  StealthWorkspaceConfig,
  stealthHome,
  workspacesDir,
} from "@stealth/shared";
import { isStubContent } from "@stealth/shared";

export interface WorkspaceContext {
  root: string;
  config: StealthWorkspaceConfig;
}

export function isStealthInternalPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return (
    normalized === STEALTH_DIR ||
    normalized.startsWith(`${STEALTH_DIR}/`) ||
    normalized.endsWith(CONFIG_FILE)
  );
}

export async function readWorkspaceConfig(
  workspaceRoot: string
): Promise<StealthWorkspaceConfig | undefined> {
  try {
    const raw = await fs.readFile(
      path.join(workspaceRoot, STEALTH_DIR, CONFIG_FILE),
      "utf-8"
    );
    return JSON.parse(raw) as StealthWorkspaceConfig;
  } catch {
    return undefined;
  }
}

export async function findWorkspaceFromCwd(
  cwd: string
): Promise<WorkspaceContext | undefined> {
  let dir = path.resolve(cwd);
  const root = path.parse(dir).root;
  while (true) {
    const config = await readWorkspaceConfig(dir);
    if (config) {
      return { root: dir, config };
    }
    if (dir === root) {
      break;
    }
    dir = path.dirname(dir);
  }
  return undefined;
}

export async function resolveWorkspace(options: {
  cwd: string;
  workspaceFlag?: string;
}): Promise<WorkspaceContext> {
  if (options.workspaceFlag) {
    const candidate = path.isAbsolute(options.workspaceFlag)
      ? options.workspaceFlag
      : path.join(workspacesDir(), options.workspaceFlag);
    const config = await readWorkspaceConfig(candidate);
    if (!config) {
      throw new Error(`No Stealth workspace at ${candidate}`);
    }
    return { root: candidate, config };
  }

  const envRoot = process.env.STEALTH_WORKSPACE?.trim();
  if (envRoot) {
    const config = await readWorkspaceConfig(envRoot);
    if (!config) {
      throw new Error(`STEALTH_WORKSPACE is not a Stealth workspace: ${envRoot}`);
    }
    return { root: path.resolve(envRoot), config };
  }

  const fromCwd = await findWorkspaceFromCwd(options.cwd);
  if (fromCwd) {
    return fromCwd;
  }

  throw new Error(
    "Not inside a Stealth workspace. Open a repo in Cursor first, or:\n" +
      `  cd ~/.stealth/workspaces/<id>\n` +
      "  stealth --workspace <id> push <file>\n" +
      "  stealth workspaces"
  );
}

export async function listWorkspaces(): Promise<WorkspaceContext[]> {
  const dir = workspacesDir();
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }

  const out: WorkspaceContext[] = [];
  for (const id of entries) {
    const root = path.join(dir, id);
    const stat = await fs.stat(root).catch(() => undefined);
    if (!stat?.isDirectory()) {
      continue;
    }
    const config = await readWorkspaceConfig(root);
    if (config) {
      out.push({ root, config });
    }
  }
  return out.sort((a, b) =>
    `${a.config.repo.owner}/${a.config.repo.repo}`.localeCompare(
      `${b.config.repo.owner}/${b.config.repo.repo}`
    )
  );
}

export function normalizeRelativePath(
  workspaceRoot: string,
  inputPath: string
): string {
  const resolved = path.isAbsolute(inputPath)
    ? path.relative(workspaceRoot, inputPath)
    : inputPath;
  const relative = resolved.replace(/\\/g, "/");
  if (!relative || relative.startsWith("..")) {
    throw new Error(`Path must be inside workspace: ${inputPath}`);
  }
  if (isStealthInternalPath(relative)) {
    throw new Error(`Cannot use Stealth internal path: ${relative}`);
  }
  return relative;
}

export async function loadFileSha(
  workspaceRoot: string,
  relativePath: string
): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(
      path.join(workspaceRoot, STEALTH_DIR, "file-shas.json"),
      "utf-8"
    );
    const map = JSON.parse(raw) as Record<string, string>;
    return map[relativePath];
  } catch {
    return undefined;
  }
}

export async function setFileSha(
  workspaceRoot: string,
  relativePath: string,
  sha: string
): Promise<void> {
  const shaPath = path.join(workspaceRoot, STEALTH_DIR, "file-shas.json");
  let map: Record<string, string> = {};
  try {
    map = JSON.parse(await fs.readFile(shaPath, "utf-8")) as Record<
      string,
      string
    >;
  } catch {
    // new map
  }
  map[relativePath] = sha;
  await fs.mkdir(path.join(workspaceRoot, STEALTH_DIR), { recursive: true });
  await fs.writeFile(shaPath, JSON.stringify(map, null, 2), "utf-8");
}

export async function readWorkspaceFile(
  workspaceRoot: string,
  relativePath: string
): Promise<Buffer> {
  const full = path.join(workspaceRoot, relativePath);
  const content = await fs.readFile(full);
  if (isStubContent(content)) {
    throw new Error(
      `${relativePath} is a Stealth stub — open/hydrate in the editor first, or use: stealth write ${relativePath}`
    );
  }
  if (content.includes(0)) {
    throw new Error(`${relativePath} looks binary — cannot push via Contents API.`);
  }
  return content;
}

export function stealthHomePath(): string {
  return stealthHome();
}
