import * as path from "path";
import * as vscode from "vscode";
import { openGitHubRepository } from "./commands/openRepository";
import { openRemoteFile } from "./commands/openFile";
import { deleteRemoteFile, saveRemoteFile } from "./commands/saveFile";
import { refreshRemoteIndex } from "./commands/refreshIndex";
import { browseRemoteFiles } from "./commands/browseFiles";
import { findRemoteFile } from "./commands/findFile";
import { openInGithubDev, openOnGitHub } from "./commands/openWeb";
import { showRecentCommits } from "./commands/commits";
import {
  compareWithRemote,
  pullFromGitHub,
} from "./commands/compare";
import { openPullRequests } from "./commands/pullRequests";
import { createPullRequest } from "./commands/createPr";
import { showDiskGovernor } from "./commands/diskGovernor";
import { hydrateActiveFile } from "./commands/hydrateActive";
import { copyHydratedFileForAi } from "./commands/copyForAi";
import { registerStubGuard } from "./guard/stubGuard";
import { openStealthDashboard } from "./dashboard/panel";
import { maybeShowWelcome } from "./onboarding";
import { switchStealthWorkspace } from "./commands/switchWorkspace";
import { togglePinWorkspaceCache } from "./commands/pinWorkspace";
import { registerBlameGutter } from "./blame/gutter";
import { runEvictCache, showCacheActions } from "./commands/cache";
import { newRemoteFile } from "./commands/newFile";
import { renameRemoteFile } from "./commands/renameFile";
import {
  createGitHubBranch,
  switchGitHubBranch,
} from "./commands/branches";
import { hydrateDocumentIfStub } from "./commands/hydrateDocument";
import { pinCurrentFile, unpinCurrentFile } from "./commands/pinFile";
import { showStealthHub } from "./commands/hub";
import { openInCodespace } from "./commands/codespace";
import { runDeepIndex } from "./commands/deepIndex";
import { showFileBlame, showFileHistory } from "./commands/history";
import { signInToGitHub } from "./auth";
import { createStatusBar, updateStatusBar } from "./statusBar";
import { getActiveStealthConfig } from "./workspace/config";
import { reloadStealthWorkspace } from "./workspace/reload";
import {
  focusRemoteFilesView,
  registerRemoteTree,
} from "./tree/remoteTreeProvider";
import { registerLicensingCommands } from "./licensing/commands";
import { ensureTrialStarted } from "./licensing/store";
import { getLicensingConfig } from "./licensing/config";
import { hasProAccess } from "./licensing/access";
import { maybeNotifyTrialExpired } from "./licensing/notify";

function scheduleHydrate(doc: vscode.TextDocument, reveal: boolean): void {
  void (async () => {
    if (!(await hasProAccess())) {
      return;
    }
    await hydrateDocumentIfStub(doc, { silent: true, reveal });
  })();
}

export function activate(context: vscode.ExtensionContext): void {
  registerLicensingCommands(context);
  const treeProvider = registerRemoteTree(context);
  createStatusBar(context);
  registerBlameGutter(context);
  registerStubGuard(context);

  const reload = () => reloadStealthWorkspace(treeProvider);

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void reload();
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      void saveRemoteFile(doc);
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      scheduleHydrate(doc, true);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        scheduleHydrate(editor.document, false);
      }
    }),
    vscode.commands.registerCommand("stealth.openRepository", () =>
      openGitHubRepository(context, treeProvider)
    ),
    vscode.commands.registerCommand("stealth.hub", () =>
      showStealthHub(context, treeProvider)
    ),
    vscode.commands.registerCommand("stealth.dashboard", () =>
      openStealthDashboard(context)
    ),
    vscode.commands.registerCommand("stealth.switchWorkspace", () =>
      switchStealthWorkspace()
    ),
    vscode.commands.registerCommand("stealth.refreshIndex", () =>
      refreshRemoteIndex(treeProvider)
    ),
    vscode.commands.registerCommand("stealth.browseFiles", () =>
      browseRemoteFiles()
    ),
    vscode.commands.registerCommand("stealth.findFile", () => findRemoteFile()),
    vscode.commands.registerCommand("stealth.openOnGitHub", () => openOnGitHub()),
    vscode.commands.registerCommand("stealth.openInGithubDev", () =>
      openInGithubDev()
    ),
    vscode.commands.registerCommand("stealth.recentCommits", () =>
      showRecentCommits()
    ),
    vscode.commands.registerCommand("stealth.compareWithRemote", () =>
      compareWithRemote()
    ),
    vscode.commands.registerCommand("stealth.pullFromGitHub", () =>
      pullFromGitHub()
    ),
    vscode.commands.registerCommand("stealth.openPullRequests", () =>
      openPullRequests()
    ),
    vscode.commands.registerCommand("stealth.createPullRequest", () =>
      createPullRequest()
    ),
    vscode.commands.registerCommand("stealth.diskGovernor", () =>
      showDiskGovernor()
    ),
    vscode.commands.registerCommand("stealth.hydrateActiveFile", () =>
      hydrateActiveFile()
    ),
    vscode.commands.registerCommand("stealth.copyForAi", () =>
      copyHydratedFileForAi()
    ),
    vscode.commands.registerCommand("stealth.pinWorkspaceCache", () =>
      togglePinWorkspaceCache()
    ),
    vscode.commands.registerCommand("stealth.signIn", () => signInToGitHub()),
    vscode.commands.registerCommand(
      "stealth.openRemoteFile",
      (relativePath: string) => openRemoteFile(relativePath)
    ),
    vscode.commands.registerCommand("stealth.focusRemoteView", () =>
      focusRemoteFilesView()
    ),
    vscode.commands.registerCommand("stealth.reloadWorkspace", () => reload()),
    vscode.commands.registerCommand("stealth.pushToGitHub", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage("Open a file to push.");
        return;
      }
      void saveRemoteFile(editor.document);
    }),
    vscode.commands.registerCommand("stealth.cacheActions", () =>
      showCacheActions()
    ),
    vscode.commands.registerCommand("stealth.evictCache", () => runEvictCache()),
    vscode.commands.registerCommand("stealth.switchBranch", () =>
      switchGitHubBranch(context, treeProvider)
    ),
    vscode.commands.registerCommand("stealth.createBranch", () =>
      createGitHubBranch(context, treeProvider)
    ),
    vscode.commands.registerCommand("stealth.newRemoteFile", () =>
      newRemoteFile(treeProvider)
    ),
    vscode.commands.registerCommand("stealth.renameRemoteFile", (uri?: vscode.Uri) =>
      renameRemoteFile(uri, treeProvider)
    ),
    vscode.commands.registerCommand("stealth.openInCodespace", () =>
      openInCodespace()
    ),
    vscode.commands.registerCommand("stealth.deepIndex", () =>
      runDeepIndex(treeProvider)
    ),
    vscode.commands.registerCommand("stealth.fileHistory", () =>
      showFileHistory()
    ),
    vscode.commands.registerCommand("stealth.fileBlame", () => showFileBlame()),
    vscode.commands.registerCommand("stealth.pinFile", () => pinCurrentFile()),
    vscode.commands.registerCommand("stealth.unpinFile", () => unpinCurrentFile()),
    vscode.commands.registerCommand("stealth.deleteRemoteFile", (uri?: vscode.Uri) => {
      void (async () => {
        const active = await getActiveStealthConfig();
        if (!active) {
          void vscode.window.showWarningMessage("No Stealth workspace open.");
          return;
        }
        const targetUri =
          uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!targetUri || targetUri.scheme !== "file") {
          void vscode.window.showWarningMessage(
            "Right-click a file in the Stealth workspace or open it in the editor."
          );
          return;
        }
        const relative = path
          .relative(active.root.fsPath, targetUri.fsPath)
          .replace(/\\/g, "/");
        await deleteRemoteFile(relative, treeProvider);
      })();
    })
  );

  void (async () => {
    if (getLicensingConfig().enabled) {
      await ensureTrialStarted(context);
      await maybeNotifyTrialExpired(context);
    }
    await reload();
    const active = await getActiveStealthConfig();
    if (active && (treeProvider.entryCount > 0 || active.config.lazyTree)) {
      await focusRemoteFilesView();
    } else {
      await updateStatusBar();
    }
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      scheduleHydrate(editor.document, false);
    }
    await maybeShowWelcome(context);
  })();
}

export function deactivate(): void {}
