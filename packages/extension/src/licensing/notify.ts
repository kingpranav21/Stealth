import * as vscode from "vscode";
import { getAccessState } from "./access";
import { getLicensingConfig } from "./config";

const TRIAL_EXPIRED_WARNED_KEY = "stealth.trialExpiredWarned.v1";

/** One-time modal when trial ends and user has no license. */
export async function maybeNotifyTrialExpired(
  context: vscode.ExtensionContext
): Promise<void> {
  const config = getLicensingConfig();
  if (!config.enabled) {
    return;
  }

  const state = await getAccessState();
  if (state.tier !== "expired") {
    return;
  }

  if (context.globalState.get<boolean>(TRIAL_EXPIRED_WARNED_KEY)) {
    return;
  }

  await context.globalState.update(TRIAL_EXPIRED_WARNED_KEY, true);

  const actions: string[] = [];
  if (config.checkoutUrl) {
    actions.push("Upgrade");
  }
  actions.push("Enter License Key");

  const pick = await vscode.window.showWarningMessage(
    `Your ${config.trialDays}-day Stealth GitHub trial has ended. Subscribe to keep opening repos, loading files, and saving to GitHub.`,
    { modal: true },
    ...actions
  );

  if (pick === "Upgrade" && config.checkoutUrl) {
    await vscode.env.openExternal(vscode.Uri.parse(config.checkoutUrl));
  } else if (pick === "Enter License Key") {
    await vscode.commands.executeCommand("stealth.activateLicense");
  }
}

export async function clearTrialExpiredNotice(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.globalState.update(TRIAL_EXPIRED_WARNED_KEY, undefined);
}
