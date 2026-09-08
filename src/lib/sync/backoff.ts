const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryableError = { status?: number; retryAfterSeconds?: number; reason?: string };

// Gmail's quota/rate-limit errors come back as plain HTTP 403 — identical
// status to a genuine permission error — with only this `reason` string
// (parsed from the response body) telling the two apart. Retrying a real
// permission error would just waste attempts, so 403 alone is not enough.
const RETRYABLE_GMAIL_REASONS = new Set(["rateLimitExceeded", "userRateLimitExceeded", "quotaExceeded", "dailyLimitExceeded"]);

function isRetryable(err: unknown): err is RetryableError {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as RetryableError).status;
  if (status === 429 || (typeof status === "number" && status >= 500)) return true;
  const reason = (err as RetryableError).reason;
  return status === 403 && typeof reason === "string" && RETRYABLE_GMAIL_REASONS.has(reason);
}

/** Retries `fn` on 429/5xx with exponential backoff + jitter, honoring Retry-After when present. */
export async function withBackoff<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) throw err;
      const retryAfterMs = (err as RetryableError).retryAfterSeconds
        ? (err as RetryableError).retryAfterSeconds! * 1000
        : BASE_DELAY_MS * 2 ** attempt + Math.random() * 250;
      await sleep(retryAfterMs);
    }
  }
  throw lastError;
}
