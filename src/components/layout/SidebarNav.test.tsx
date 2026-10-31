// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/quarantine" }));

import { SidebarNav } from "./SidebarNav";

describe("SidebarNav", () => {
  it("marks only the current page", () => {
    render(<SidebarNav badges={{}} />);
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
    expect(current.map((l) => l.getAttribute("href"))).toEqual(["/quarantine"]);
  });

  it("shows compact counts and hides zero badges", () => {
    render(
      <SidebarNav
        badges={{
          "/": { count: 4521, tone: "neutral" },
          "/security": { count: 0, tone: "danger" },
          "/accounts": { count: 1, tone: "warning" },
        }}
      />,
    );
    expect(screen.getByRole("link", { name: /Boîte unifiée/ }).textContent).toMatch(/4,5\s?k/);
    expect(screen.getByRole("link", { name: /Sécurité/ }).textContent).toBe("Sécurité");
    expect(screen.getByRole("link", { name: /Comptes/ }).textContent).toBe("Comptes1");
  });
});
