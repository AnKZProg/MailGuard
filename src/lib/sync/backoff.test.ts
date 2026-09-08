import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withBackoff } from "./backoff";

async function runAndFlush<T>(promise: Promise<T>): Promise<T> {
  // Let each queued retry's setTimeout fire without needing a real sleep.
  // `.then(f, f)` (not `.finally`, which re-throws) so this observer promise
  // never itself becomes an unhandled rejection — the caller's own
  // `expect(...).rejects` is what actually handles `promise`.
  let pending = true;
  promise.then(
    () => {
      pending = false;
    },
    () => {
      pending = false;
    },
  );
  while (pending) {
    await vi.advanceTimersByTimeAsync(60_000);
  }
  return promise;
}

describe("withBackoff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the result on the first success without retrying", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(runAndFlush(withBackoff(fn))).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and eventually succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce("ok");
    await expect(runAndFlush(withBackoff(fn))).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 5xx", async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce("ok");
    await expect(runAndFlush(withBackoff(fn))).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries a Gmail 403 whose reason is a known quota error", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 403, reason: "userRateLimitExceeded" })
      .mockResolvedValueOnce("ok");
    await expect(runAndFlush(withBackoff(fn))).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a plain 403 with no recognized quota reason", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 403 });
    await expect(runAndFlush(withBackoff(fn))).rejects.toEqual({ status: 403 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a 403 whose reason is a genuine permission error", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 403, reason: "insufficientPermissions" });
    await expect(runAndFlush(withBackoff(fn))).rejects.toEqual({ status: 403, reason: "insufficientPermissions" });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after the max attempts and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 429 });
    await expect(runAndFlush(withBackoff(fn))).rejects.toEqual({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it("honors Retry-After instead of the default exponential delay", async () => {
    const fn = vi.fn().mockRejectedValueOnce({ status: 429, retryAfterSeconds: 1 }).mockResolvedValueOnce("ok");
    await expect(runAndFlush(withBackoff(fn))).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
