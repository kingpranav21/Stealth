export interface RateLimitState {
  limit: number;
  remaining: number;
  resetAt: Date;
  updatedAt: Date;
}

let state: RateLimitState | undefined;

export function setCoreRateLimit(
  limit: number,
  remaining: number,
  resetUnixSec: number
): void {
  state = {
    limit,
    remaining,
    resetAt: new Date(resetUnixSec * 1000),
    updatedAt: new Date(),
  };
}

export function recordRateLimit(headers: Headers): void {
  const remaining = headers.get("x-ratelimit-remaining");
  const limit = headers.get("x-ratelimit-limit");
  const reset = headers.get("x-ratelimit-reset");
  if (remaining === null || limit === null) {
    return;
  }
  const resetSec = reset ? parseInt(reset, 10) : 0;
  state = {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    resetAt: new Date(resetSec > 0 ? resetSec * 1000 : Date.now()),
    updatedAt: new Date(),
  };
}

export function getRateLimitState(): RateLimitState | undefined {
  return state;
}

export function formatRateLimitShort(): string {
  if (!state) {
    return "";
  }
  return `${state.remaining}/${state.limit} API`;
}

export function formatRateLimitTooltip(): string {
  if (!state) {
    return "GitHub API quota (updates after next request)";
  }
  const reset = state.resetAt.toLocaleTimeString();
  return `GitHub API: ${state.remaining} of ${state.limit} requests left (resets ~${reset})`;
}
