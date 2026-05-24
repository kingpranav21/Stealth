import * as path from "path";
import * as vscode from "vscode";
import { IndexEntry, RepoIndex } from "@stealth/shared";
import { getGitHubToken } from "../auth";
import { listDirectory } from "../github/client";
import { loadIndexByPath } from "../index/store";
import { getActiveStealthConfig } from "../workspace/config";
import { hasProAccess } from "../licensing/access";

export class RemoteTreeItem extends vscode.TreeItem {
  constructor(
    readonly entry: IndexEntry | undefined,
    readonly relativePath: string,
    readonly isDirectory: boolean,
    collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(path.basename(relativePath) || relativePath, collapsibleState);
    if (!isDirectory && relativePath) {
      this.description = relativePath;
      this.tooltip = relativePath;
    }
    this.contextValue = isDirectory ? "stealthDirectory" : "stealthFile";
    this.iconPath = isDirectory
      ? new vscode.ThemeIcon("folder")
      : new vscode.ThemeIcon("file");
    if (!isDirectory) {
      this.command = {
        command: "stealth.openRemoteFile",
        title: "Open",
        arguments: [relativePath],
      };
    }
    this.id = relativePath;
  }
}

interface TreeNode {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  entry?: IndexEntry;
  children: Map<string, TreeNode>;
}

function buildTree(entries: IndexEntry[]): TreeNode {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isDirectory: true,
    children: new Map(),
  };

  for (const entry of entries) {
    const parts = entry.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join("/");

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath,
          isDirectory: !isLast,
          entry: isLast ? entry : undefined,
          children: new Map(),
        });
      }
      current = current.children.get(part)!;
      if (isLast) {
        current.entry = entry;
        current.isDirectory = false;
      }
    }
  }

  return root;
}

function dirCollapsible(
  isDirectory: boolean,
  hasKnownChildren: boolean
): vscode.TreeItemCollapsibleState {
  if (!isDirectory) {
    return vscode.TreeItemCollapsibleState.None;
  }
  return hasKnownChildren
    ? vscode.TreeItemCollapsibleState.Collapsed
    : vscode.TreeItemCollapsibleState.Collapsed;
}

export class RemoteTreeProvider implements vscode.TreeDataProvider<RemoteTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    RemoteTreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private index: RepoIndex | undefined;
  private rootNode: TreeNode | undefined;
  private lazyTree = false;
  private loadPromise: Promise<void> | undefined;
  private readonly dirCache = new Map<string, IndexEntry[]>();

  treeView?: vscode.TreeView<RemoteTreeItem>;

  async refresh(): Promise<void> {
    this.dirCache.clear();
    await this.loadIndex();
    this._onDidChangeTreeData.fire(undefined);
    this.updateViewTitle();
  }

  async loadIndex(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.doLoadIndex();
    }
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = undefined;
    }
  }

  private async doLoadIndex(): Promise<void> {
    const active = await getActiveStealthConfig();
    const config = active?.config;
    if (!config) {
      this.index = undefined;
      this.rootNode = undefined;
      this.lazyTree = false;
      return;
    }
    this.lazyTree = Boolean(config.lazyTree);
    this.index = await loadIndexByPath(config.indexPath);
    this.rootNode =
      this.index && !this.lazyTree ? buildTree(this.index.entries) : undefined;
  }

  get entryCount(): number {
    return this.index?.entries.length ?? 0;
  }

  private updateViewTitle(): void {
    if (!this.treeView) {
      return;
    }
    const active = this.index?.repo;
    if (this.lazyTree && active) {
      const shallow = this.index?.shallow;
      this.treeView.title = shallow
        ? "Remote Repository (shallow)"
        : "Remote Repository (lazy)";
      this.treeView.message = `${active.owner}/${active.repo} — expand folders to load`;
      return;
    }
    const n = this.entryCount;
    if (active && n > 0) {
      this.treeView.title = `Remote Repository (${n})`;
      this.treeView.message = `${active.owner}/${active.repo}`;
    } else {
      this.treeView.title = "Remote Repository";
      this.treeView.message = "No files — run Refresh Remote Index";
    }
  }

  getTreeItem(element: RemoteTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RemoteTreeItem): vscode.ProviderResult<RemoteTreeItem[]> {
    return this.getChildrenAsync(element);
  }

  private async getChildrenAsync(
    element?: RemoteTreeItem
  ): Promise<RemoteTreeItem[]> {
    const active = await getActiveStealthConfig();
    if (!active?.config) {
      return [];
    }

    if (this.lazyTree) {
      return this.getChildrenLazy(active.config.repo, element?.relativePath ?? "");
    }

    if (!this.rootNode) {
      await this.loadIndex();
    }
    if (!this.rootNode) {
      return [];
    }

    const node = element
      ? findNode(this.rootNode, element.relativePath)
      : this.rootNode;

    if (!node) {
      return [];
    }

    return this.nodesToItems(node);
  }

  private async getChildrenLazy(
    repo: import("@stealth/shared").RepoRef,
    dirPath: string
  ): Promise<RemoteTreeItem[]> {
    if (!(await hasProAccess())) {
      return [];
    }

    const cacheKey = dirPath || "/";
    let entries = this.dirCache.get(cacheKey);
    if (!entries) {
      const token = await getGitHubToken(false);
      if (!token) {
        return [];
      }
      const items = await listDirectory(token, repo, dirPath);
      entries = items.map((item) => ({
        path: item.path,
        sha: item.sha,
        type: item.type === "dir" ? "tree" : "blob",
      }));
      this.dirCache.set(cacheKey, entries);
    }

    return entries
      .sort((a, b) => {
        const aDir = a.type === "tree";
        const bDir = b.type === "tree";
        if (aDir !== bDir) {
          return aDir ? -1 : 1;
        }
        return a.path.localeCompare(b.path);
      })
      .map((entry) => {
        const isDirectory = entry.type === "tree";
        return new RemoteTreeItem(
          entry,
          entry.path,
          isDirectory,
          dirCollapsible(isDirectory, isDirectory)
        );
      });
  }

  private nodesToItems(node: TreeNode): RemoteTreeItem[] {
    const sorted = [...node.children.values()].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted.map((child) => {
      const hasChildren = child.isDirectory && child.children.size > 0;
      return new RemoteTreeItem(
        child.entry,
        child.fullPath,
        child.isDirectory,
        dirCollapsible(child.isDirectory, hasChildren)
      );
    });
  }
}

function findNode(root: TreeNode, relativePath: string): TreeNode | undefined {
  if (!relativePath) {
    return root;
  }
  const parts = relativePath.split("/");
  let current = root;
  for (const part of parts) {
    const next = current.children.get(part);
    if (!next) {
      return undefined;
    }
    current = next;
  }
  return current;
}

export function registerRemoteTree(
  context: vscode.ExtensionContext
): RemoteTreeProvider {
  const provider = new RemoteTreeProvider();

  const treeView = vscode.window.createTreeView("stealth.remoteFiles", {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  provider.treeView = treeView;
  context.subscriptions.push(treeView);

  return provider;
}

export async function focusRemoteFilesView(): Promise<void> {
  try {
    await vscode.commands.executeCommand("stealth.remoteFiles.focus");
  } catch {
    await vscode.commands.executeCommand("workbench.view.explorer");
  }
}
