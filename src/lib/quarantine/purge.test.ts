import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
vi.mock("@/lib/db", () => ({ db: { quarantineItem: { findMany: (...args: unknown[]) => findMany(...args) } } }));
vi.mock("@/lib/providers/token-manager", () => ({ getValidAccessToken: vi.fn() }));

import { purgeAllActiveItems, purgeDueItems } from "./purge";

describe("purge only targets accounts that can reach their provider", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  it("skips items of accounts that need reconnecting in the scheduled purge", async () => {
    await expect(purgeDueItems()).resolves.toEqual({ purged: 0, failed: 0 });
    const { where } = findMany.mock.calls[0][0];
    expect(where.message).toEqual({ account: { status: "ACTIVE" } });
    expect(where.purgeAfter).toBeDefined();
  });

  it("applies the same filter to the user's purge-all", async () => {
    await purgeAllActiveItems();
    const { where } = findMany.mock.calls[0][0];
    expect(where.message).toEqual({ account: { status: "ACTIVE" } });
    expect(where.purgeAfter).toBeUndefined();
  });
});
