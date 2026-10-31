// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/app/actions/message-actions", () => ({ restoreNow: vi.fn() }));

import { QuarantineRow } from "./QuarantineRow";

const NOW = new Date("2026-10-31T12:00:00Z").getTime();
const DAY = 24 * 60 * 60 * 1000;

function item(purgeInMs: number) {
  return {
    id: "q1",
    messageId: "m1",
    purgeAfter: new Date(NOW + purgeInMs),
    message: {
      subject: "",
      verdict: "PHISHING",
      fromDisplayName: "Faux Colis",
      fromAddress: "colis@scam.example",
      receivedAt: new Date(NOW - DAY),
      account: { emailAddress: "me@example.com" },
    },
  } as unknown as Parameters<typeof QuarantineRow>[0]["item"];
}

describe("QuarantineRow purge label", () => {
  it.each([
    [-1000, "purge imminente", true],
    [DAY / 2, "purge demain", true],
    [3 * DAY, "purge dans 3 jours", true],
    [10 * DAY, "purge dans 10 jours", false],
  ])("%d ms before purge reads %s", (delta, label, urgent) => {
    render(<QuarantineRow item={item(delta)} now={NOW} />);
    expect(screen.getByText(label).className.includes("text-verdict-phishing")).toBe(urgent);
  });

  it("shows sender, mailbox and a restore button", () => {
    render(<QuarantineRow item={item(5 * DAY)} now={NOW} />);
    expect(screen.getByText("(sans objet)")).toBeTruthy();
    expect(screen.getByText(/Faux Colis/).textContent).toContain("me@example.com");
    expect(screen.getByRole("button", { name: "Restaurer" })).toBeTruthy();
  });
});
