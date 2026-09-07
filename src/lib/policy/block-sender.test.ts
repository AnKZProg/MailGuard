import { describe, expect, it } from "vitest";
import { isSafeBlockPattern } from "./block-sender";

describe("isSafeBlockPattern", () => {
  it("accepts a plain email address", () => {
    expect(isSafeBlockPattern("ADDRESS", "attacker@evil.com")).toBe(true);
  });

  it("accepts a plain domain", () => {
    expect(isSafeBlockPattern("DOMAIN", "evil.com")).toBe(true);
  });

  it("accepts a subdomain", () => {
    expect(isSafeBlockPattern("DOMAIN", "mail.evil.co.uk")).toBe(true);
  });

  // fromAddress comes straight off a real "From" header — parseAddressHeader
  // only strips the surrounding "Name <...>" wrapper, it doesn't validate
  // what's inside the brackets. Gmail's filter `from` criterion is parsed
  // with the same query grammar as Gmail search, so any of these would
  // otherwise become part of the actual filter query instead of a literal
  // sender match.
  it("rejects an address crafted to break out into a Gmail search query", () => {
    expect(isSafeBlockPattern("ADDRESS", "a@b.com) OR (to:victim")).toBe(false);
  });

  it("rejects a pattern containing parentheses", () => {
    expect(isSafeBlockPattern("DOMAIN", "evil.com) OR (from:ceo")).toBe(false);
  });

  it("rejects a pattern containing whitespace", () => {
    expect(isSafeBlockPattern("ADDRESS", "a@b.com OR to:victim")).toBe(false);
  });

  it("rejects a pattern containing quotes", () => {
    expect(isSafeBlockPattern("DOMAIN", 'evil.com" OR "x')).toBe(false);
  });

  it("rejects an address with no domain", () => {
    expect(isSafeBlockPattern("ADDRESS", "attacker@")).toBe(false);
  });

  it("rejects a domain with no dot", () => {
    expect(isSafeBlockPattern("DOMAIN", "evil")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isSafeBlockPattern("ADDRESS", "")).toBe(false);
    expect(isSafeBlockPattern("DOMAIN", "")).toBe(false);
  });
});
