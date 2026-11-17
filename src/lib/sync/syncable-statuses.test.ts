import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { SYNCABLE_STATUSES } = await import("@/lib/sync/run-sync");

describe("SYNCABLE_STATUSES", () => {
  it("retries accounts left in ERROR by a transient failure (MAIL-26)", () => {
    expect(SYNCABLE_STATUSES).toContain("ERROR");
    expect(SYNCABLE_STATUSES).toContain("ACTIVE");
  });

  it("never auto-syncs an account that needs the user to reconnect", () => {
    expect(SYNCABLE_STATUSES).not.toContain("NEEDS_RECONSENT");
  });
});
