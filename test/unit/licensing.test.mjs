import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isTrialActive, trialDaysLeft } from "@stealth/shared";

describe("license trial", () => {
  const start = Date.parse("2026-01-01T00:00:00Z");

  it("counts days left including partial days", () => {
    const day3 = start + 2.5 * 86_400_000;
    assert.equal(trialDaysLeft(start, 14, day3), 12);
  });

  it("ends trial after period", () => {
    const day15 = start + 14 * 86_400_000;
    assert.equal(trialDaysLeft(start, 14, day15), 0);
    assert.equal(isTrialActive(start, 14, day15), false);
  });

  it("trial active on first day", () => {
    assert.equal(isTrialActive(start, 14, start), true);
  });
});
