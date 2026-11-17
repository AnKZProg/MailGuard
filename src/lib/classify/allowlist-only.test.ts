import { describe, expect, it } from "vitest";
import {
  ALLOWLIST_ONLY_RULE_ID,
  isUnknownSenderUnderAllowlist,
  quarantineAsUnknownSender,
  type AllowlistOnlyInput,
} from "@/lib/classify/allowlist-only";
import type { ClassificationResult } from "@/lib/classify/score";

const ENABLED = new Date("2026-11-17T10:00:00Z");

function input(overrides: Partial<AllowlistOnlyInput> = {}): AllowlistOnlyInput {
  return {
    enabledSince: ENABLED,
    receivedAt: new Date("2026-11-17T12:00:00Z"),
    policyOverride: null,
    userVerdict: null,
    senderConfirmed: false,
    ...overrides,
  };
}

describe("isUnknownSenderUnderAllowlist", () => {
  it("flags an unknown sender on a box in allowlist mode", () => {
    expect(isUnknownSenderUnderAllowlist(input())).toBe(true);
  });

  it("never applies when the mode is off for this box", () => {
    expect(isUnknownSenderUnderAllowlist(input({ enabledSince: undefined }))).toBe(false);
  });

  it("never touches mail received before the mode was turned on (a re-scan must not quarantine the history)", () => {
    expect(isUnknownSenderUnderAllowlist(input({ receivedAt: new Date("2026-11-16T12:00:00Z") }))).toBe(false);
  });

  it("lets an explicitly allowed sender through", () => {
    expect(isUnknownSenderUnderAllowlist(input({ policyOverride: "ALLOW" }))).toBe(false);
  });

  it("leaves a blocked sender to the block policy", () => {
    expect(isUnknownSenderUnderAllowlist(input({ policyOverride: "BLOCK" }))).toBe(false);
  });

  it("lets a sender the user already confirmed as legitimate through", () => {
    expect(isUnknownSenderUnderAllowlist(input({ senderConfirmed: true }))).toBe(false);
  });

  it("respects a verdict the user set by hand on this exact message", () => {
    expect(isUnknownSenderUnderAllowlist(input({ userVerdict: "LEGITIMATE" }))).toBe(false);
  });
});

describe("quarantineAsUnknownSender", () => {
  const legit: ClassificationResult = { verdict: "LEGITIMATE", score: 0.1, signals: [], shouldQuarantine: false };

  it("turns a would-be legitimate message into quarantined spam with an explanatory signal", () => {
    const result = quarantineAsUnknownSender(legit);
    expect(result.verdict).toBe("SPAM");
    expect(result.shouldQuarantine).toBe(true);
    expect(result.signals.map((s) => s.ruleId)).toContain(ALLOWLIST_ONLY_RULE_ID);
  });

  it("keeps a phishing verdict as phishing (stronger warning than spam)", () => {
    const result = quarantineAsUnknownSender({ ...legit, verdict: "PHISHING", score: 0.9 });
    expect(result.verdict).toBe("PHISHING");
    expect(result.shouldQuarantine).toBe(true);
  });

  it("does not mutate the original result", () => {
    quarantineAsUnknownSender(legit);
    expect(legit).toEqual({ verdict: "LEGITIMATE", score: 0.1, signals: [], shouldQuarantine: false });
  });
});
