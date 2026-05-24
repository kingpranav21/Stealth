import { workspaceId } from "@stealth/shared";
import { resolveBranch, fetchFileText, githubFetchUser } from "./github";
import { pushFileToGitHub, writeAndPush } from "./push";
import { resolveGitHubToken } from "./token";
import {
  listWorkspaces,
  resolveWorkspace,
  stealthHomePath,
} from "./workspace";

function usage(): void {
  console.log(`Stealth CLI — push files to GitHub from ~/.stealth workspaces

Usage:
  stealth workspaces              List open Stealth workspaces
  stealth push <file...>          Push local file(s) to GitHub
  stealth write <path>            Write stdin to file and push
  stealth touch <path>            Create empty file locally and on GitHub
  stealth cat <path>              Print file from GitHub (remote)
  stealth auth                    Verify GitHub token

Options:
  -w, --workspace <id|path>       Workspace under ~/.stealth/workspaces/
  -m, --message <text>            Git commit message
  -C, --directory <path>          Working directory (default: cwd)

Environment:
  GITHUB_TOKEN / STEALTH_GITHUB_TOKEN / gh auth token
  STEALTH_WORKSPACE               Default workspace root

Examples:
  cd ~/.stealth/workspaces/pranavahuja-stealth-main
  echo '# Hi' | stealth write docs/note.md -m 'Add note'
  stealth push src/foo.ts
  stealth touch scripts/new.sh && chmod +x scripts/new.sh && stealth push scripts/new.sh
`);
}

function parseArgs(argv: string[]): {
  command: string;
  positional: string[];
  workspace?: string;
  message?: string;
  cwd: string;
} {
  const positional: string[] = [];
  let workspace: string | undefined;
  let message: string | undefined;
  let cwd = process.cwd();
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "-w" || arg === "--workspace") {
      workspace = argv[++i];
    } else if (arg === "-m" || arg === "--message") {
      message = argv[++i];
    } else if (arg === "-C" || arg === "--directory") {
      cwd = argv[++i];
    } else if (arg === "-h" || arg === "--help") {
      return { command: "help", positional: [], cwd };
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
    i++;
  }
  const command = positional[0] ?? "help";
  return {
    command,
    positional: positional.slice(1),
    workspace,
    message,
    cwd,
  };
}

async function readStdin(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function main(): Promise<void> {
  const { command, positional, workspace, message, cwd } = parseArgs(
    process.argv.slice(2)
  );

  if (command === "help" || command === "--help") {
    usage();
    return;
  }

  if (command === "workspaces") {
    const list = await listWorkspaces();
    if (!list.length) {
      console.log(`No workspaces under ${stealthHomePath()}/workspaces/`);
      console.log("Open a repo in Cursor: Stealth → Open GitHub Repository…");
      return;
    }
    for (const ws of list) {
      const { owner, repo, branch } = ws.config.repo;
      const id = workspaceId(ws.config.repo);
      console.log(
        `${id}\n  ${owner}/${repo} @ ${branch || "(default)"}\n  ${ws.root}\n`
      );
    }
    return;
  }

  const token = resolveGitHubToken();

  if (command === "auth") {
    const login = await githubFetchUser(token);
    console.log(`GitHub token OK (${login})`);
    return;
  }

  const ws = await resolveWorkspace({ cwd, workspaceFlag: workspace });

  if (command === "push") {
    if (!positional.length) {
      throw new Error("Usage: stealth push <file...>");
    }
    for (const file of positional) {
      await pushFileToGitHub(token, ws, file, { message });
    }
    return;
  }

  if (command === "write") {
    if (!positional[0]) {
      throw new Error("Usage: stealth write <path>  (pipe content on stdin)");
    }
    const content = await readStdin();
    await writeAndPush(token, ws, positional[0], content, message);
    return;
  }

  if (command === "touch") {
    if (!positional[0]) {
      throw new Error("Usage: stealth touch <path>");
    }
    await writeAndPush(token, ws, positional[0], Buffer.alloc(0), message);
    return;
  }

  if (command === "cat") {
    if (!positional[0]) {
      throw new Error("Usage: stealth cat <path>");
    }
    const relative = positional[0].replace(/\\/g, "/");
    const repo = await resolveBranch(token, ws.config.repo);
    const text = await fetchFileText(token, repo, relative);
    process.stdout.write(text);
    if (!text.endsWith("\n")) {
      process.stdout.write("\n");
    }
    return;
  }

  throw new Error(`Unknown command: ${command}. Run: stealth --help`);
}

main().catch((err) => {
  console.error(`stealth: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
