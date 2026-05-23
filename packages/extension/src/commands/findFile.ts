import * as vscode from "vscode";
import { searchCodeInRepo, GitHubApiError } from "../github/client";
import { getGitHubToken } from "../auth";
import { loadIndexByPath } from "../index/store";
import { getActiveStealthConfig } from "../workspace/config";
import { openRemoteFile } from "./openFile";

type FilePick = vscode.QuickPickItem & { path: string };

function debounce(fn: (query: string) => void, ms: number): (query: string) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (query: string) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(query), ms);
  };
}

function localMatches(
  entries: Array<{ path: string; size?: number }>,
  query: string,
  limit: number
): FilePick[] {
  const q = query.toLowerCase();
  return entries
    .filter((e) => e.path.toLowerCase().includes(q))
    .slice(0, limit)
    .map((e) => ({
      label: e.path,
      description: e.size !== undefined ? `${e.size} B` : undefined,
      path: e.path,
    }));
}

/**
 * Find files by name/path — local index when available, else GitHub code search.
 * Replaces the old shallow "type full path" flow.
 */
export async function findRemoteFile(): Promise<void> {
  const active = await getActiveStealthConfig();
  if (!active) {
    void vscode.window.showErrorMessage(
      "No Stealth workspace open. Run Stealth: Open GitHub Repository… first."
    );
    return;
  }

  const token = await getGitHubToken(false);
  const index = await loadIndexByPath(active.config.indexPath);
  const hasFullIndex =
    index && !index.shallow && index.entries.length > 0 && !active.config.shallow;

  const qp = vscode.window.createQuickPick<FilePick>();
  qp.title = `${active.config.repo.owner}/${active.config.repo.repo}`;
  qp.placeholder = hasFullIndex
    ? "Type to filter files (e.g. app.tsx)"
    : "Type to search GitHub (e.g. filename:readme or src/)";
  qp.matchOnDescription = true;

  if (hasFullIndex) {
    qp.items = index!.entries
      .sort((a, b) => a.path.localeCompare(b.path))
      .slice(0, 80)
      .map((e) => ({
        label: e.path,
        description: e.size !== undefined ? `${e.size} B` : undefined,
        path: e.path,
      }));
  }

  let searchGeneration = 0;

  const runQuery = async (query: string) => {
    const gen = ++searchGeneration;

    if (!query.trim()) {
      if (hasFullIndex && index) {
        qp.items = index.entries
          .sort((a, b) => a.path.localeCompare(b.path))
          .slice(0, 80)
          .map((e) => ({
            label: e.path,
            description: e.size !== undefined ? `${e.size} B` : undefined,
            path: e.path,
          }));
      } else {
        qp.items = [];
      }
      qp.busy = false;
      return;
    }

    if (hasFullIndex && index) {
      const local = localMatches(index.entries, query, 50);
      if (local.length > 0) {
        qp.items = local;
        qp.busy = false;
        return;
      }
    }

    if (!token) {
      qp.items = [];
      return;
    }

    qp.busy = true;
    try {
      const hits = await searchCodeInRepo(token, active.config.repo, query);
      if (gen !== searchGeneration) {
        return;
      }
      qp.items = hits.map((h) => ({
        label: h.path,
        description: "GitHub search",
        path: h.path,
      }));
      if (!hits.length) {
        qp.items = [
          {
            label: "No matches",
            description: "Try another term or Deep Index for full browse",
            path: "",
            alwaysShow: true,
          },
        ];
      }
    } catch (err) {
      if (gen !== searchGeneration) {
        return;
      }
      const msg =
        err instanceof GitHubApiError ? err.message : String(err);
      qp.items = [
        {
          label: `Search failed: ${msg}`,
          path: "",
          alwaysShow: true,
        },
      ];
    } finally {
      if (gen === searchGeneration) {
        qp.busy = false;
      }
    }
  };

  qp.onDidChangeValue(debounce((q) => void runQuery(q), 280));

  const picked = await new Promise<FilePick | undefined>((resolve) => {
    qp.onDidAccept(() => {
      const item = qp.selectedItems[0];
      resolve(item?.path ? item : undefined);
    });
    qp.onDidHide(() => resolve(undefined));
    qp.show();
  });

  qp.dispose();

  if (picked?.path) {
    await openRemoteFile(picked.path);
  }
}
