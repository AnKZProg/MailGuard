// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictFilterTabs } from "./VerdictFilterTabs";

describe("VerdictFilterTabs", () => {
  it("keeps the other filters in every tab link and marks the active one", () => {
    render(<VerdictFilterTabs query={{ verdict: "SPAM", account: "acc-1" }} />);
    expect(screen.getByRole("link", { name: "Spam" }).getAttribute("aria-current")).toBe("page");
    const all = screen.getByRole("link", { name: "Tous" }).getAttribute("href");
    expect(all).toContain("account=acc-1");
    expect(all).not.toContain("verdict=");
    expect(screen.getByRole("link", { name: "Phishing" }).getAttribute("href")).toContain("verdict=PHISHING");
  });

  it("shows non-zero counts only", () => {
    render(<VerdictFilterTabs query={{}} counts={{ ALL: 12, LEGITIMATE: 12, SPAM: 0 }} />);
    expect(screen.getByRole("link", { name: /^Tous\s*12$/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Spam" }).textContent).toBe("Spam");
  });
});
