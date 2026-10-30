import { describe, expect, it } from "vitest";
import { decideHost } from "@/lib/http/host-guard";

const APP = "http://127.0.0.1:3000";

describe("decideHost", () => {
  it("allows the exact APP_URL host", () => {
    expect(decideHost("127.0.0.1:3000", APP)).toBe("allow");
  });

  it("redirects other loopback aliases on the same port to the canonical host", () => {
    expect(decideHost("localhost:3000", APP)).toBe("canonicalize");
    expect(decideHost("LOCALHOST:3000", APP)).toBe("canonicalize");
    expect(decideHost("[::1]:3000", APP)).toBe("canonicalize");
  });

  it("rejects a DNS-rebinding hostname even though it resolves to 127.0.0.1", () => {
    expect(decideHost("evil.example:3000", APP)).toBe("reject");
    expect(decideHost("127.0.0.1.nip.io:3000", APP)).toBe("reject");
  });

  it("rejects loopback on another port, a missing header, and garbage", () => {
    expect(decideHost("127.0.0.1:4000", APP)).toBe("reject");
    expect(decideHost(null, APP)).toBe("reject");
    expect(decideHost("a b/c", APP)).toBe("reject");
  });
});
