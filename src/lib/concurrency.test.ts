import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("returns fulfilled results in the same order as the input", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(results).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
      { status: "fulfilled", value: 30 },
      { status: "fulfilled", value: 40 },
    ]);
  });

  it("never runs more than `limit` at the same time", async () => {
    let active = 0;
    let maxActive = 0;

    await mapWithConcurrency(Array.from({ length: 10 }, (_, i) => i), 3, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("keeps going after one item rejects, reporting it as rejected in place", async () => {
    const results = await mapWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });

    expect(results[0]).toEqual({ status: "fulfilled", value: 1 });
    expect(results[1]).toMatchObject({ status: "rejected" });
    expect(results[2]).toEqual({ status: "fulfilled", value: 3 });
  });

  it("handles an empty input", async () => {
    const results = await mapWithConcurrency([], 3, async () => 1);
    expect(results).toEqual([]);
  });

  it("handles a limit larger than the input", async () => {
    const results = await mapWithConcurrency([1, 2], 10, async (n) => n);
    expect(results).toEqual([
      { status: "fulfilled", value: 1 },
      { status: "fulfilled", value: 2 },
    ]);
  });
});
