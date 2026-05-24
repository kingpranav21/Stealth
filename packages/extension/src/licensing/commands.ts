import * as vscode from "vscode";
import { getLicensingConfig } from "./config";
import {
  getAccessState,
  refreshLicenseCache,
  setLicensingContext,
} from "./access";
import {
  getStoredLicenseKey,
  setLicenseCache,
  setStoredLicenseKey,
} from "./store";
import { validateLicenseWithServer } from "./validate";
import { updateStatusBar } from "../statusBar";
import { clearTrialExpiredNotice } from "./notify";

export function registerLicensingCommands(
  context: vscode.ExtensionContext
): void {
  setLicensingContext(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("stealth.activateLicense", () =>
      activateLicense(context)
    ),
    vscode.commands.registerCommand("stealth.manageSubscription", () =>
      manageSubscription()
    ),
    vscode.commands.registerCommand("stealth.licenseStatus", () =>
      showLicenseStatus()
    )
  );
}

async function activateLicense(
  context: vscode.ExtensionContext
): Promise<void> {
  const existing = await getStoredLicenseKey(context);
  const input = await vscode.window.showInputBox({
    title: "Activate Stealth GitHub Pro",
    prompt: "Paste the license key from your purchase email",
    password: true,
    value: existing ?? "",
    ignoreFocusOut: true,
  });
  if (!input?.trim()) {
    return;
  }

  const key = input.trim();
  const config = getLicensingConfig();
  if (config.provider === "proxy" && !config.licenseApiUrl) {
    void vscode.window.showErrorMessage(
      "Cannot verify license yet: set stealth.licenseApiUrl in Settings (your license API)."
    );
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Verifying license…",
    },
    async () => {
      const result = await validateLicenseWithServer(context, key);
      if (!result.valid) {
        void vscode.window.showErrorMessage(
          result.message ?? "License key is not valid."
        );
        await setStoredLicenseKey(context, undefined);
        await setLicenseCache(context, undefined);
        return;
      }

      await setStoredLicenseKey(context, key);
      await setLicenseCache(context, {
        valid: true,
        checkedAt: Date.now(),
        expiresAt: result.expiresAt ?? null,
      });
      await clearTrialExpiredNotice(context);
      void vscode.window.showInformationMessage(
        "Stealth GitHub Pro activated. Thank you!"
      );
      await updateStatusBar();
    }
  );
}

async function manageSubscription(): Promise<void> {
  const { checkoutUrl } = getLicensingConfig();
  if (!checkoutUrl) {
    void vscode.window.showInformationMessage(
      "Set stealth.checkoutUrl in Settings to your Stripe or Lemon Squeezy checkout page."
    );
    return;
  }
  await vscode.env.openExternal(vscode.Uri.parse(checkoutUrl));
}

async function showLicenseStatus(): Promise<void> {
  const state = await getAccessState();
  const config = getLicensingConfig();
  const lines = [state.message];
  if (config.enabled && state.tier === "expired") {
    lines.push("Open repos and push to GitHub require Pro.");
  }
  const pick = await vscode.window.showInformationMessage(
    lines.join(" "),
    "Enter License Key",
    ...(config.checkoutUrl ? ["Upgrade"] : []),
    "Refresh License"
  );
  if (pick === "Enter License Key") {
    await vscode.commands.executeCommand("stealth.activateLicense");
  } else if (pick === "Upgrade") {
    await manageSubscription();
  } else if (pick === "Refresh License") {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Refreshing license…",
      },
      async () => {
        const ok = await refreshLicenseCache();
        void vscode.window.showInformationMessage(
          ok ? "License is active." : "No active license found."
        );
        await updateStatusBar();
      }
    );
  }
}
