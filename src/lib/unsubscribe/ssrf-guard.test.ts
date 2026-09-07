import { describe, expect, it, vi } from "vitest";
import { assertPublicHttpUrl } from "./ssrf-guard";

const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  default: { lookup: (...args: unknown[]) => lookupMock(...args) },
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

describe("assertPublicHttpUrl", () => {
  it("rejects a non-http(s) scheme", async () => {
    await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow();
  });

  it("rejects the literal hostname localhost", async () => {
    await expect(assertPublicHttpUrl("http://localhost/unsub")).rejects.toThrow();
  });

  it("rejects a literal loopback IPv4 address without a DNS lookup", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1:4000/admin")).rejects.toThrow();
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects a literal link-local IPv4 address (cloud metadata range)", async () => {
    await expect(assertPublicHttpUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
  });

  it("rejects a literal RFC1918 private address", async () => {
    await expect(assertPublicHttpUrl("http://192.168.1.1/")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://10.0.0.5/")).rejects.toThrow();
    await expect(assertPublicHttpUrl("http://172.16.0.1/")).rejects.toThrow();
  });

  it("rejects a literal IPv6 loopback address", async () => {
    await expect(assertPublicHttpUrl("http://[::1]/unsub")).rejects.toThrow();
  });

  it("rejects a hostname that resolves to a private address", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
    await expect(assertPublicHttpUrl("https://sneaky.example.com/unsub")).rejects.toThrow();
  });

  it("accepts a hostname that resolves to a public address", async () => {
    lookupMock.mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertPublicHttpUrl("https://list.example.com/unsub")).resolves.toBeUndefined();
  });

  it("rejects when DNS resolution returns no addresses at all", async () => {
    lookupMock.mockResolvedValueOnce([]);
    await expect(assertPublicHttpUrl("https://nowhere.example.com/unsub")).rejects.toThrow();
  });
});
