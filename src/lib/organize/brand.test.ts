import { describe, expect, it } from "vitest";
import { brandForDomain } from "./brand";

describe("brandForDomain", () => {
  it("returns null for a public personal-email domain", () => {
    expect(brandForDomain("gmail.com")).toBeNull();
  });

  it("titlecases the second-level domain for an unknown brand", () => {
    expect(brandForDomain("some-store.com")).toBe("Some Store");
  });

  it("resolves a known alias domain to its canonical brand name", () => {
    expect(brandForDomain("battle.net")).toBe("Blizzard");
  });

  it("resolves a compound-suffix domain to its registrable SLD", () => {
    expect(brandForDomain("shop.example.co.uk")).toBe("Example");
  });

  it("tolerates a trailing dot (RFC-valid FQDN)", () => {
    expect(brandForDomain("amazon.com.")).toBe("Amazon");
  });

  it("rejects a domain containing characters that aren't valid in a DNS hostname", () => {
    // A crafted From: header could put anything after the last "@" — this
    // must never reach titleCase()/a provider folder name unvalidated.
    expect(brandForDomain("amazon.com'; DROP--")).toBeNull();
    expect(brandForDomain("amazon.com/../etc")).toBeNull();
    expect(brandForDomain("amazon com")).toBeNull();
    expect(brandForDomain("")).toBeNull();
  });

  it("rejects a bare label with no dot (not a real domain)", () => {
    expect(brandForDomain("localhost")).toBeNull();
  });
});
