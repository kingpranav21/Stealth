import * as vscode from "vscode";

const WELCOME_KEY = "stealth.welcomeShown.v1";

export async function maybeShowWelcome(
  context: vscode.ExtensionContext
): Promise<void> {
  if (context.globalState.get<boolean>(WELCOME_KEY)) {
    return;
  }

  const choice = await vscode.window.showInformationMessage(
    "Stealth opens GitHub repos without a full clone — capped disk, Stub Guard for AI, and a global Disk Governor.",
    "Open Dashboard",
    "Open Repository",
    "Later"
  );

  await context.globalState.update(WELCOME_KEY, true);

  if (choice === "Open Dashboard") {
    await vscode.commands.executeCommand("stealth.dashboard");
  } else if (choice === "Open Repository") {
    await vscode.commands.executeCommand("stealth.openRepository");
  }
}
