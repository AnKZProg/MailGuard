import { describe, expect, it } from "vitest";
import { levenshteinDistance } from "./levenshtein";

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("amazon.fr", "amazon.fr")).toBe(0);
  });

  it("returns the string length when one side is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("counts a single substitution as distance 1", () => {
    expect(levenshteinDistance("amazon.fr", "amaz0n.fr")).toBe(1);
  });

  it("counts a single insertion/deletion as distance 1", () => {
    expect(levenshteinDistance("paypal.com", "paypa.com")).toBe(1);
    expect(levenshteinDistance("paypal.com", "paypall.com")).toBe(1);
  });
});
