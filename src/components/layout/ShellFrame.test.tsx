// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { ShellFrame } from "./ShellFrame";

function shell() {
  return (
    <ShellFrame sidebar={<nav aria-label="Navigation principale">liens</nav>}>
      <p>contenu</p>
    </ShellFrame>
  );
}

const drawer = () => document.getElementById("app-sidebar")!;
const menuButton = () => screen.getByRole("button", { name: /menu/ });

beforeEach(() => {
  pathname = "/";
});

describe("ShellFrame mobile drawer", () => {
  it("starts closed, with the page content rendered", () => {
    render(shell());
    expect(screen.getByText("contenu")).toBeTruthy();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(drawer().hasAttribute("data-open")).toBe(false);
  });

  it("the menu button opens the drawer and moves focus into it", () => {
    render(shell());
    fireEvent.click(menuButton());
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(menuButton().getAttribute("aria-label")).toBe("Fermer le menu");
    expect(drawer().hasAttribute("data-open")).toBe(true);
    expect(document.activeElement).toBe(drawer());
  });

  it("Escape and the backdrop close it", () => {
    render(shell());
    fireEvent.click(menuButton());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(drawer().hasAttribute("data-open")).toBe(false);

    fireEvent.click(menuButton());
    fireEvent.click(document.querySelector(".bg-black\\/40")!);
    expect(drawer().hasAttribute("data-open")).toBe(false);
  });

  it("closes when navigating to another page", () => {
    const { rerender } = render(shell());
    fireEvent.click(menuButton());
    pathname = "/quarantine";
    rerender(shell());
    expect(drawer().hasAttribute("data-open")).toBe(false);
  });
});
