import * as vscode from "vscode";

export type LicensingProvider = "lemonsqueezy" | "proxy";

export interface LicensingConfig {
  enabled: boolean;
  provider: LicensingProvider;
  trialDays: number;
  licenseApiUrl: string;
  checkoutUrl: string;
  revalidateHours: number;
}

export function getLicensingConfig(): LicensingConfig {
  const cfg = vscode.workspace.getConfiguration("stealth");
  return {
    enabled: cfg.get<boolean>("licensing.enabled", true),
    provider: cfg.get<LicensingProvider>("licensing.provider", "lemonsqueezy"),
    trialDays: cfg.get<number>("trialDays", 14),
    licenseApiUrl: (cfg.get<string>("licenseApiUrl", "") ?? "").trim(),
    checkoutUrl: (cfg.get<string>("checkoutUrl", "") ?? "").trim(),
    revalidateHours: cfg.get<number>("licensing.revalidateHours", 24),
  };
}
