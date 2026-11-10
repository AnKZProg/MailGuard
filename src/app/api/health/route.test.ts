import { describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { $queryRaw: queryRaw } }));

import { GET } from "./route";

describe("GET /api/health", () => {
  it("answers ok when the database responds", async () => {
    queryRaw.mockResolvedValueOnce([{ 1: 1 }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 without details when the database is unreachable", async () => {
    queryRaw.mockRejectedValueOnce(new Error("SQLITE_CANTOPEN"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "db_unavailable" });
  });
});
