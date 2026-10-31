// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProtectionSummary } from "./ProtectionSummary";

describe("ProtectionSummary", () => {
  it("totals the week and links to the quarantine", () => {
    render(<ProtectionSummary perDay={[0, 3, 1200, 0, 5, 0, 1]} />);
    const card = screen.getByRole("link");
    expect(card.getAttribute("href")).toBe("/quarantine");
    expect(card.textContent?.replace(/\s/g, " ")).toMatch(/1 209 mails mis à l'abri/);
  });

  it("uses the singular and drops the sparkline on a quiet week", () => {
    const { container } = render(<ProtectionSummary perDay={[0, 0, 0, 0, 0, 0, 0]} />);
    expect(screen.getByRole("link").textContent).toContain("mail mis à l'abri");
    expect(container.querySelector("div[aria-hidden]")).toBeNull();
  });
});
