import { describe, expect, it } from "vitest";
import { bucketPerDay } from "@/lib/queries/shell-stats";

describe("bucketPerDay", () => {
  const now = new Date(2026, 9, 30, 15, 0);

  it("puts today last and ignores anything outside the window", () => {
    const dates = [
      new Date(2026, 9, 30, 1, 0),
      new Date(2026, 9, 30, 14, 0),
      new Date(2026, 9, 29, 23, 0),
      new Date(2026, 9, 24, 8, 0),
      new Date(2026, 9, 23, 8, 0), // 7 days ago: outside a 7-day window
    ];
    expect(bucketPerDay(dates, now, 7)).toEqual([1, 0, 0, 0, 0, 1, 2]);
  });
});
