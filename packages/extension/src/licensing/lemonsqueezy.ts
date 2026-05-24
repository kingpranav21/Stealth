import type { ValidateLicenseResponse } from "./validate";

const LS_BASE = "https://api.lemonsqueezy.com/v1/licenses";

interface LsLicenseKey {
  status?: string;
  expires_at?: string | null;
}

interface LsValidateResponse {
  valid: boolean;
  error?: string | null;
  license_key?: LsLicenseKey;
  instance?: { id?: string };
}

interface LsActivateResponse {
  activated: boolean;
  error?: string | null;
  license_key?: LsLicenseKey;
  instance?: { id?: string };
}

async function lemonSqueezyPost<T>(
  path: "validate" | "activate",
  fields: Record<string, string>
): Promise<T> {
  const res = await fetch(`${LS_BASE}/${path}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams(fields),
  });

  const data = (await res.json()) as T & { error?: string };
  if (!res.ok && typeof data.error === "string") {
    throw new Error(data.error);
  }
  return data;
}

function toResult(
  valid: boolean,
  licenseKey?: LsLicenseKey,
  message?: string | null
): ValidateLicenseResponse {
  return {
    valid,
    expiresAt: licenseKey?.expires_at ?? null,
    message: message ?? undefined,
  };
}

/**
 * Validate (and activate if needed) via Lemon Squeezy License API.
 * @see https://docs.lemonsqueezy.com/api/license-api
 */
export async function validateWithLemonSqueezy(
  licenseKey: string,
  instanceId: string
): Promise<ValidateLicenseResponse & { instanceId?: string }> {
  try {
    const validated = await lemonSqueezyPost<LsValidateResponse>("validate", {
      license_key: licenseKey,
      instance_id: instanceId,
    });

    if (validated.valid) {
      const id = validated.instance?.id ?? instanceId;
      return { ...toResult(true, validated.license_key), instanceId: id };
    }

    const activated = await lemonSqueezyPost<LsActivateResponse>("activate", {
      license_key: licenseKey,
      instance_name: "Stealth GitHub",
    });

    if (!activated.activated) {
      return toResult(
        false,
        activated.license_key,
        activated.error ?? validated.error ?? "Could not activate license."
      );
    }

    const newInstanceId = activated.instance?.id ?? instanceId;
    const recheck = await lemonSqueezyPost<LsValidateResponse>("validate", {
      license_key: licenseKey,
      instance_id: newInstanceId,
    });

    return {
      ...toResult(
        recheck.valid,
        recheck.license_key ?? activated.license_key,
        recheck.error ?? activated.error
      ),
      instanceId: newInstanceId,
    };
  } catch (err) {
    return {
      valid: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
