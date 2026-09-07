import { afterEach, describe, expect, it, vi } from "vitest";
import { attemptUnsubscribe } from "./unsubscribe";

// attemptUnsubscribe now resolves the target hostname before every fetch (SSRF
// guard — see ssrf-guard.ts) — stub it to a public address so these tests stay
// hermetic instead of depending on real DNS/network access.
vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]) },
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

describe("attemptUnsubscribe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported when only a mailto: target is offered", async () => {
    const result = await attemptUnsubscribe("<mailto:unsub@example.com>", null);
    expect(result.result).toBe("unsupported");
  });

  it("POSTs the one-click body when List-Unsubscribe-Post declares support", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await attemptUnsubscribe("<https://list.example.com/unsub?id=1>", "List-Unsubscribe=One-Click");

    expect(result.result).toBe("success");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://list.example.com/unsub?id=1",
      expect.objectContaining({ method: "POST", body: "List-Unsubscribe=One-Click" }),
    );
  });

  it("falls back to a GET when one-click isn't declared", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await attemptUnsubscribe("<https://list.example.com/unsub?id=1>", null);

    expect(result.result).toBe("success");
    expect(fetchMock).toHaveBeenCalledWith("https://list.example.com/unsub?id=1", expect.objectContaining({ method: "GET" }));
  });

  it("prefers the https target when both mailto and https are offered", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await attemptUnsubscribe("<mailto:unsub@example.com>, <https://list.example.com/unsub>", null);

    expect(fetchMock).toHaveBeenCalledWith("https://list.example.com/unsub", expect.anything());
  });

  it("reports failed on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const result = await attemptUnsubscribe("<https://list.example.com/unsub>", null);
    expect(result.result).toBe("failed");
  });

  it("reports failed on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const result = await attemptUnsubscribe("<https://list.example.com/unsub>", null);
    expect(result.result).toBe("failed");
  });

  it("retries with POST when the default GET is rejected with 405", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await attemptUnsubscribe("<https://list.example.com/unsub>", null);

    expect(result.result).toBe("success");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://list.example.com/unsub", expect.objectContaining({ method: "GET" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://list.example.com/unsub", expect.objectContaining({ method: "POST" }));
  });

  it("retries with GET when a declared one-click POST is rejected with 405", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await attemptUnsubscribe("<https://list.example.com/unsub>", "List-Unsubscribe=One-Click");

    expect(result.result).toBe("success");
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://list.example.com/unsub", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://list.example.com/unsub", expect.objectContaining({ method: "GET" }));
  });

  it("does not retry a second time if the fallback also fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 405 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await attemptUnsubscribe("<https://list.example.com/unsub>", null);

    expect(result.result).toBe("failed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
