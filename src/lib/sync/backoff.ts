const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RetryableError = { status?: number; retryAfterSeconds?: number };

function isRetryable(err: unknown): err is RetryableError {
  if (typeof err !== "object" || err === null) return false;
  const status = (err as RetryableError).status;
  return status === 429 || (typeof status === "number" && status >= 500);
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
