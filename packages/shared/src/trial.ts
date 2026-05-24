const MS_PER_DAY = 86_400_000;

export function trialDaysLeft(
  trialStartedAtMs: number,
  trialDays: number,
  nowMs = Date.now()
): number {
  if (trialDays <= 0) {
    return 0;
  }
  const elapsed = nowMs - trialStartedAtMs;
  const totalMs = trialDays * MS_PER_DAY;
  if (elapsed >= totalMs) {
    return 0;
  }
  return Math.ceil((totalMs - elapsed) / MS_PER_DAY);
}

export function isTrialActive(
  trialStartedAtMs: number,
  trialDays: number,
  nowMs = Date.now()
): boolean {
  return trialDaysLeft(trialStartedAtMs, trialDays, nowMs) > 0;
}
