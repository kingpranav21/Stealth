import * as vscode from "vscode";

const TRIAL_STARTED_KEY = "stealth.trialStartedAt";
const LICENSE_CACHE_KEY = "stealth.licenseCache";
const LICENSE_SECRET_KEY = "stealth.licenseKey";
const LICENSE_INSTANCE_KEY = "stealth.licenseInstanceId";

export interface LicenseCache {
  valid: boolean;
  checkedAt: number;
  expiresAt: string | null;
}

export async function ensureTrialStarted(
  context: vscode.ExtensionContext
): Promise<number> {
  const existing = context.globalState.get<number>(TRIAL_STARTED_KEY);
  if (existing !== undefined) {
    return existing;
  }
  const now = Date.now();
  await context.globalState.update(TRIAL_STARTED_KEY, now);
  return now;
}

export function getTrialStartedAt(
  context: vscode.ExtensionContext
): number | undefined {
  return context.globalState.get<number>(TRIAL_STARTED_KEY);
}

export async function getStoredLicenseKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  return context.secrets.get(LICENSE_SECRET_KEY);
}

export async function setStoredLicenseKey(
  context: vscode.ExtensionContext,
  key: string | undefined
): Promise<void> {
  if (key) {
    await context.secrets.store(LICENSE_SECRET_KEY, key);
  } else {
    await context.secrets.delete(LICENSE_SECRET_KEY);
    await setLicenseInstanceId(context, undefined);
  }
}

export function getLicenseInstanceId(
  context: vscode.ExtensionContext
): string {
  return (
    context.globalState.get<string>(LICENSE_INSTANCE_KEY) ??
    vscode.env.machineId
  );
}

export async function setLicenseInstanceId(
  context: vscode.ExtensionContext,
  instanceId: string | undefined
): Promise<void> {
  if (instanceId) {
    await context.globalState.update(LICENSE_INSTANCE_KEY, instanceId);
  } else {
    await context.globalState.update(LICENSE_INSTANCE_KEY, undefined);
  }
}

export function getLicenseCache(
  context: vscode.ExtensionContext
): LicenseCache | undefined {
  return context.globalState.get<LicenseCache>(LICENSE_CACHE_KEY);
}

export async function setLicenseCache(
  context: vscode.ExtensionContext,
  cache: LicenseCache | undefined
): Promise<void> {
  if (cache) {
    await context.globalState.update(LICENSE_CACHE_KEY, cache);
  } else {
    await context.globalState.update(LICENSE_CACHE_KEY, undefined);
  }
}
