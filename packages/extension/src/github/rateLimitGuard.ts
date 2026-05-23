import * as vscode from "vscode";
import { GitHubApiError } from "./client";
import { getRateLimitState } from "./rateLimit";

let sessionWarned = false;

export function getRateLimitWarnAt(): number {
  return vscode.workspace
    .getConfiguration("stealth")
    .get<number>("rateLimitWarnAt", 100);
}

/** Returns false if user cancels due to low quota. */
export async function confirmIfLowQuota(
  operation: string
): Promise<boolean> {
  const state = getRateLimitState();
  const threshold = getRateLimitWarnAt();
  if (!state || state.remaining >= threshold) {
    return true;
  }

  if (sessionWarned) {
    return true;
  }

  const reset = state.resetAt.toLocaleTimeString();
  const choice = await vscode.window.showWarningMessage(
    `GitHub API quota is low (${state.remaining}/${state.limit} left, resets ~${reset}). Continue ${operation}?`,
    "Continue",
    "Cancel"
  );

  if (choice === "Continue") {
    sessionWarned = true;
    return true;
  }

  return false;
}

export function assertQuotaOrThrow(allowed: boolean): void {
  if (!allowed) {
    throw new GitHubApiError(
      "Request cancelled — GitHub API quota is low.",
      0
    );
  }
}

export function resetQuotaWarnSession(): void {
  sessionWarned = false;
}
