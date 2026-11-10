import { describe, expect, it } from "vitest";
import { assertId, assertScope, optionalQuery } from "./action-input";

describe("assertId", () => {
  it("accepts a cuid", () => {
    expect(() => assertId("clx1abcd0000qwertyuiop1234")).not.toThrow();
  });

  it.each([undefined, null, 42, {}, "", "x".repeat(65)])("rejects %p", (value) => {
    expect(() => assertId(value)).toThrow("Identifiant invalide");
  });
});

describe("assertScope", () => {
  it("accepts ADDRESS and DOMAIN only", () => {
    expect(() => assertScope("ADDRESS")).not.toThrow();
    expect(() => assertScope("DOMAIN")).not.toThrow();
    expect(() => assertScope("ALL")).toThrow("Portée inconnue");
  });
});

describe("optionalQuery", () => {
  it("passes strings through and treats missing values as no query", () => {
    expect(optionalQuery("paypal")).toBe("paypal");
    expect(optionalQuery(undefined)).toBeUndefined();
    expect(optionalQuery(null)).toBeUndefined();
  });

  it("rejects non-strings and oversized queries", () => {
    expect(() => optionalQuery({ contains: "" })).toThrow("Recherche invalide");
    expect(() => optionalQuery("a".repeat(201))).toThrow("Recherche invalide");
  });
});
