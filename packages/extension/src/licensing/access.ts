import * as vscode from "vscode";
import { getLicensingConfig } from "./config";
import {
  ensureTrialStarted,
  getLicenseCache,
  getStoredLicenseKey,
  getTrialStartedAt,
  setLicenseCache,
} from "./store";
import { isTrialActive, trialDaysLeft } from "@stealth/shared";
import {
  validateLicenseWithServer,
  licenseCacheIsFresh as cacheFresh,
  licenseCacheStillValid as cacheValid,
} from "./validate";
import type { LicenseCache } from "./store";

let extensionContext: vscode.ExtensionContext | undefined;

export function setLicensingContext(
  context: vscode.ExtensionContext
): void {
  extensionContext = context;
}

function ctx(): vscode.ExtensionContext {
  if (!extensionContext) {
    throw new Error("Licensing not initialized");
  }
  return extensionContext;
}

export type AccessTier = "licensed" | "trial" | "expired" | "disabled";

export interface AccessState {
  tier: AccessTier;
  daysLeft?: number;
  message: string;
}

export async function refreshLicenseCache(): Promise<boolean> {
  const context = ctx();
  const config = getLicensingConfig();
  const key = await getStoredLicenseKey(context);
  if (!key) {
    await setLicenseCache(context, undefined);
    return false;
  }

  const result = await validateLicenseWithServer(context, key);
  const cache: LicenseCache = {
    valid: result.valid,
    checkedAt: Date.now(),
    expiresAt: result.expiresAt ?? null,
  };
  await setLicenseCache(context, cache);
  return result.valid && cacheValid(cache);
}

async function resolveLicensed(): Promise<boolean> {
  const context = ctx();
  const config = getLicensingConfig();
  const key = await getStoredLicenseKey(context);
  if (!key) {
    return false;
  }

  const cache = getLicenseCache(context);
  if (
    cache &&
    cacheFresh(cache, config.revalidateHours) &&
    cacheValid(cache)
  ) {
    return cache.valid;
  }

  try {
    return await refreshLicenseCache();
  } catch {
    if (cache && cacheValid(cache)) {
      return cache.valid;
    }
    return false;
  }
}

export async function getAccessState(): Promise<AccessState> {
  const config = getLicensingConfig();
  if (!config.enabled) {
    return { tier: "disabled", message: "Licensing checks are off." };
  }

  const context = ctx();

  if (await resolveLicensed()) {
    return { tier: "licensed", message: "Pro license active." };
  }

  const startedAt = getTrialStartedAt(context) ?? (await ensureTrialStarted(context));
  const days = trialDaysLeft(startedAt, config.trialDays);
  if (isTrialActive(startedAt, config.trialDays)) {
    return {
      tier: "trial",
      daysLeft: days,
      message: `Free trial — ${days} day${days === 1 ? "" : "s"} left.`,
    };
  }

  return {
    tier: "expired",
    message: "Trial ended. Activate a license to open repos and push to GitHub.",
  };
}

export async function hasProAccess(): Promise<boolean> {
  const state = await getAccessState();
  return state.tier === "licensed" || state.tier === "trial" || state.tier === "disabled";
}

export async function requireProAccess(feature: string): Promise<boolean> {
  if (await hasProAccess()) {
    return true;
  }

  const config = getLicensingConfig();
  const state = await getAccessState();
  const upgrade = config.checkoutUrl ? "Upgrade" : undefined;
  const choices = [
    ...(upgrade ? [upgrade] : []),
    "Enter License Key",
    "License Status",
  ] as const;

  const pick = await vscode.window.showWarningMessage(
    `Stealth GitHub Pro required for ${feature}. ${state.message}`,
    ...choices
  );

  if (pick === "Upgrade" && config.checkoutUrl) {
    await vscode.env.openExternal(vscode.Uri.parse(config.checkoutUrl));
  } else if (pick === "Enter License Key") {
    await vscode.commands.executeCommand("stealth.activateLicense");
  } else if (pick === "License Status") {
    await vscode.commands.executeCommand("stealth.licenseStatus");
  }

  return false;
}
