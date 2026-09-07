import { beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptToken, decryptToken } from "./token-cipher";

describe("token-cipher", () => {
  beforeEach(() => {
    process.env.MAILGUARD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a plaintext value", () => {
    const plaintext = "ya29.a0AfH6SMB_example_refresh_token";
    const encrypted = encryptToken(plaintext);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decryptToken(encryptToken(""))).toBe("");
  });

  it("round-trips unicode content", () => {
    const plaintext = "jeton avec accents éàî et emoji 🔒";
    expect(decryptToken(encryptToken(plaintext))).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "same-secret";
    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  it("rejects a tampered auth tag", () => {
    const encrypted = encryptToken("sensitive-value");
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] ^= 0xff;
    const tampered = raw.toString("base64");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects tampered ciphertext bytes", () => {
    const encrypted = encryptToken("sensitive-value");
    const raw = Buffer.from(encrypted, "base64");
    raw[15] ^= 0xff;
    expect(() => decryptToken(raw.toString("base64"))).toThrow();
  });

  it("rejects a value that is too short to contain iv+tag", () => {
    expect(() => decryptToken(Buffer.from("short").toString("base64"))).toThrow();
  });

  it("throws when the encryption key is missing", () => {
    delete process.env.MAILGUARD_ENCRYPTION_KEY;
    expect(() => encryptToken("x")).toThrow(/MAILGUARD_ENCRYPTION_KEY/);
  });

  it("throws when the encryption key is the wrong length", () => {
    process.env.MAILGUARD_ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptToken("x")).toThrow(/32 octets/);
  });

  it("cannot decrypt with a different key than it was encrypted with", () => {
    const encrypted = encryptToken("secret");
    process.env.MAILGUARD_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptToken(encrypted)).toThrow();
  });
});
