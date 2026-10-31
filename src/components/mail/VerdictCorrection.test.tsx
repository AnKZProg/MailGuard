// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/message-actions", () => ({ correctVerdictAction: vi.fn() }));

import { VerdictCorrection } from "./VerdictCorrection";

describe("VerdictCorrection", () => {
  it("presses the current verdict and invites a correction", () => {
    render(<VerdictCorrection messageId="m1" current="SPAM" confirmedByUser={false} />);
    const spam = screen.getByRole("button", { name: "Spam" });
    expect(spam.getAttribute("aria-pressed")).toBe("true");
    expect(spam.hasAttribute("disabled")).toBe(false);
    expect(screen.getByText(/clique pour corriger/)).toBeTruthy();
  });

  it("locks a verdict the user already confirmed, leaving the others open", () => {
    render(<VerdictCorrection messageId="m1" current="LEGITIMATE" confirmedByUser />);
    expect(screen.getByRole("button", { name: "Légitime" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Phishing" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByText("Verdict confirmé :")).toBeTruthy();
  });
});
