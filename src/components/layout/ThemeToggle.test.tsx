// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  document.cookie = "mailguard_theme=; max-age=0; path=/";
});

describe("ThemeToggle", () => {
  it("reflects the initial preference", () => {
    render(<ThemeToggle initial="dark" />);
    expect(screen.getByRole("radio", { name: "Thème sombre" }).getAttribute("aria-checked")).toBe("true");
  });

  it("applies the choice now and remembers it for the next server render", () => {
    render(<ThemeToggle initial="system" />);
    fireEvent.click(screen.getByRole("radio", { name: "Thème clair" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.cookie).toContain("mailguard_theme=light");
    expect(screen.getByRole("radio", { name: "Thème clair" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "Thème du système" }));
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
    expect(document.cookie).toContain("mailguard_theme=system");
  });
});
