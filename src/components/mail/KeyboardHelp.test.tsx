// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KeyboardHelp } from "./KeyboardHelp";

describe("KeyboardHelp", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<KeyboardHelp open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("closes on a backdrop click but not on a click inside the dialog", () => {
    const onClose = vi.fn();
    render(<KeyboardHelp open onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Raccourcis clavier" });
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(dialog.parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
