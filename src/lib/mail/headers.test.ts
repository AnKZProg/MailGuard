import { describe, expect, it } from "vitest";
import { parseAddressHeader, domainOf, parseAuthenticationResults, countRecipients } from "./headers";

describe("parseAddressHeader", () => {
  it("parses a display name with angle-bracket address", () => {
    expect(parseAddressHeader('"Ma Banque" <no-reply@mabanque.fr>')).toEqual({
      name: "Ma Banque",
      address: "no-reply@mabanque.fr",
    });
  });

  it("parses a display name without quotes", () => {
    expect(parseAddressHeader("Ma Banque <no-reply@mabanque.fr>")).toEqual({
      name: "Ma Banque",
      address: "no-reply@mabanque.fr",
    });
  });

  it("parses a bare address with no display name", () => {
    expect(parseAddressHeader("no-reply@mabanque.fr")).toEqual({ name: null, address: "no-reply@mabanque.fr" });
  });

  it("lowercases the address", () => {
    expect(parseAddressHeader("Someone <Person@Example.COM>").address).toBe("person@example.com");
  });

  it("handles a missing header", () => {
    expect(parseAddressHeader(undefined)).toEqual({ name: null, address: "" });
    expect(parseAddressHeader(null)).toEqual({ name: null, address: "" });
  });
});

describe("domainOf", () => {
  it("extracts the domain from an address", () => {
    expect(domainOf("person@example.com")).toBe("example.com");
  });

  it("lowercases the domain", () => {
    expect(domainOf("person@EXAMPLE.com")).toBe("example.com");
  });

  it("returns empty string for an address with no @", () => {
    expect(domainOf("not-an-email")).toBe("");
  });
});

describe("parseAuthenticationResults", () => {
  it("extracts spf, dkim, dmarc verdicts", () => {
    const header = "mx.google.com; spf=pass smtp.mailfrom=x; dkim=pass header.i=@x; dmarc=fail (p=REJECT) header.from=x";
    expect(parseAuthenticationResults(header)).toEqual({ spf: "pass", dkim: "pass", dmarc: "fail" });
  });

  it("returns null for mechanisms absent from the header", () => {
    expect(parseAuthenticationResults("mx.google.com; spf=pass smtp.mailfrom=x")).toEqual({
      spf: "pass",
      dkim: null,
      dmarc: null,
    });
  });

  it("returns all null for a missing header", () => {
    expect(parseAuthenticationResults(undefined)).toEqual({ spf: null, dkim: null, dmarc: null });
  });
});

describe("countRecipients", () => {
  it("counts comma-separated recipients", () => {
    expect(countRecipients("a@x.com, b@x.com, c@x.com")).toBe(3);
  });

  it("returns 0 for a missing header", () => {
    expect(countRecipients(undefined)).toBe(0);
  });

  it("returns 1 for a single recipient", () => {
    expect(countRecipients("a@x.com")).toBe(1);
  });
});
