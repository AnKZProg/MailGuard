/**
 * Runs `fn` over `items` with at most `limit` in flight at once, returning
 * results in the same order/shape as Promise.allSettled. Every account's own
 * sync is mostly network-bound (provider API calls), but each one also does
 * many small SQLite writes against the same on-disk file — letting all
 * accounts write concurrently causes real lock contention that stalls
 * unrelated page requests (a plain read can end up waiting behind a burst of
 * writers). A moderate cap keeps most of the network-bound speedup while
 * keeping the number of simultaneous writers small.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
