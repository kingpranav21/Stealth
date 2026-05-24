import * as vscode from "vscode";
import { getLicensingConfig } from "./config";
import type { LicenseCache } from "./store";
import { getLicenseInstanceId, setLicenseInstanceId } from "./store";
import { validateWithLemonSqueezy } from "./lemonsqueezy";

/** POST {licenseApiUrl}/validate → { valid, expiresAt? } (proxy mode only) */
export interface ValidateLicenseResponse {
  valid: boolean;
  expiresAt?: string | null;
  message?: string;
}

async function validateWithProxy(
  licenseKey: string,
  instanceId: string
): Promise<ValidateLicenseResponse> {
  const { licenseApiUrl } = getLicensingConfig();
  if (!licenseApiUrl) {
    return {
      valid: false,
      message:
        "License server not configured. Set stealth.licenseApiUrl in Settings.",
    };
  }

  const base = licenseApiUrl.replace(/\/$/, "");
  const url = `${base}/validate`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${licenseKey}`,
    },
    body: JSON.stringify({
      extension: "stealth-github",
      publisher: "kingpranav21",
      instance_id: instanceId,
    }),
  });

  if (!res.ok) {
    let message = `License check failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // ignore
    }
    return { valid: false, message };
  }

  const data = (await res.json()) as ValidateLicenseResponse;
  return {
    valid: Boolean(data.valid),
    expiresAt: data.expiresAt ?? null,
    message: data.message,
  };
}

export async function validateLicenseWithServer(
  context: vscode.ExtensionContext,
  licenseKey: string
): Promise<ValidateLicenseResponse> {
  const { provider } = getLicensingConfig();
  const instanceId = getLicenseInstanceId(context);

  if (provider === "lemonsqueezy") {
    const result = await validateWithLemonSqueezy(licenseKey, instanceId);
    if (result.instanceId) {
      await setLicenseInstanceId(context, result.instanceId);
    }
    return result;
  }

  return validateWithProxy(licenseKey, instanceId);
}

export function licenseCacheIsFresh(
  cache: LicenseCache,
  revalidateHours: number,
  nowMs = Date.now()
): boolean {
  const maxAge = revalidateHours * 3_600_000;
  return nowMs - cache.checkedAt < maxAge;
}

export function licenseCacheStillValid(
  cache: LicenseCache,
  nowMs = Date.now()
): boolean {
  if (!cache.valid) {
    return false;
  }
  if (!cache.expiresAt) {
    return true;
  }
  const exp = Date.parse(cache.expiresAt);
  return !Number.isNaN(exp) && exp > nowMs;
}
