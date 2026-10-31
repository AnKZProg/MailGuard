// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InboxFilters } from "./InboxFilters";

const ACCOUNTS = [
  { id: "a1", emailAddress: "one@example.com" },
  { id: "a2", emailAddress: "two@example.com" },
];

const bodyFlag = () => document.querySelector('input[name="body"]') as HTMLInputElement;

describe("InboxFilters", () => {
  it("keeps the active verdict and only sends body=1 when content search is on", () => {
    render(<InboxFilters query={{ verdict: "SPAM" }} accounts={ACCOUNTS} />);
    expect((document.querySelector('input[name="verdict"]') as HTMLInputElement).value).toBe("SPAM");
    expect(bodyFlag().disabled).toBe(true);
  });

  it("toggling content search re-submits only when there is a query", () => {
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    render(<InboxFilters query={{}} accounts={ACCOUNTS} />);
    const toggle = screen.getByRole("button", { pressed: false });

    fireEvent.click(toggle);
    expect(bodyFlag().disabled).toBe(false);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(submit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "facture" } });
    fireEvent.click(toggle);
    expect(bodyFlag().disabled).toBe(true);
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockRestore();
  });

  it("offers an account picker only with several accounts", () => {
    const { unmount } = render(<InboxFilters query={{}} accounts={ACCOUNTS} />);
    expect(screen.getByRole("combobox", { name: "Filtrer par compte" })).toBeTruthy();
    unmount();
    render(<InboxFilters query={{}} accounts={[ACCOUNTS[0]]} />);
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
