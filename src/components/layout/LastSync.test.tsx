// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { LastSync } from "./LastSync";

afterEach(() => {
  vi.useRealTimers();
});

describe("LastSync", () => {
  it("says when nothing was ever synced", () => {
    render(<LastSync at={null} />);
    expect(screen.getByText("Jamais synchronisé")).toBeTruthy();
  });

  it("keeps the relative time fresh on its own", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T10:00:00Z"));
    render(<LastSync at="2026-10-31T09:59:30Z" />);
    const before = screen.getByText(/^Synchronisé/).textContent;
    act(() => {
      vi.advanceTimersByTime(5 * 60_000);
    });
    const after = screen.getByText(/^Synchronisé/).textContent;
    expect(after).not.toBe(before);
    expect(after).toMatch(/minutes/);
  });
});
