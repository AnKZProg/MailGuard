// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/app/accounts/actions", () => ({ disconnectAccount: vi.fn() }));

import { DisconnectButton } from "./DisconnectButton";

const armButton = () => screen.getByRole("button", { name: "Déconnecter me@example.com" });
const confirmButton = () => screen.queryByRole("button", { name: "Confirmer la déconnexion de me@example.com" });

describe("DisconnectButton", () => {
  it("does not offer a submit until armed", () => {
    render(<DisconnectButton accountId="acc-1" emailAddress="me@example.com" />);
    expect(confirmButton()).toBeNull();
    expect(document.querySelector('button[type="submit"]')).toBeNull();
  });

  it("first click asks for confirmation and focuses the confirm button", () => {
    render(<DisconnectButton accountId="acc-1" emailAddress="me@example.com" />);
    fireEvent.click(armButton());
    const confirm = confirmButton()!;
    expect(confirm.getAttribute("type")).toBe("submit");
    expect(document.activeElement).toBe(confirm);
    expect((document.querySelector('input[name="accountId"]') as HTMLInputElement).value).toBe("acc-1");
  });

  it("Annuler and Escape both disarm it", () => {
    render(<DisconnectButton accountId="acc-1" emailAddress="me@example.com" />);
    fireEvent.click(armButton());
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(confirmButton()).toBeNull();

    fireEvent.click(armButton());
    fireEvent.keyDown(confirmButton()!, { key: "Escape" });
    expect(confirmButton()).toBeNull();
  });
});
