// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { InboxRow } from "@/lib/queries/inbox-rows";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const actions = vi.hoisted(() => ({
  quarantineNow: vi.fn<(id: string) => Promise<void>>(async () => {}),
  restoreNow: vi.fn<(id: string) => Promise<void>>(async () => {}),
  trashNow: vi.fn<(id: string) => Promise<void>>(async () => {}),
}));
vi.mock("@/app/actions/message-actions", () => actions);

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { InboxList } from "./InboxList";

function row(id: string, overrides: Partial<InboxRow> = {}): InboxRow {
  return {
    id,
    href: `/?open=${id}`,
    senderName: `Sender ${id}`,
    senderAddress: `${id}@example.com`,
    subject: `Subject ${id}`,
    snippet: null,
    verdict: "LEGITIMATE",
    isRead: false,
    dateLabel: "10:00",
    dateTitle: "",
    group: "Aujourd'hui",
    accountEmail: "me@example.com",
    accountColorVar: "var(--account-color-1)",
    ...overrides,
  };
}

const ROWS = [row("a"), row("b"), row("c", { group: "Hier" })];

function press(key: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(document.body, { key, ...init });
}

/** Lets the async action handlers (await server action → toast) settle. */
async function flush() {
  await act(async () => {});
}

function cursorRowId(): string | null {
  return document.querySelector("[data-cursor]")?.getAttribute("data-row-id") ?? null;
}

function renderList(props: Partial<Parameters<typeof InboxList>[0]> = {}) {
  return render(<InboxList rows={ROWS} closeHref="/" loadMoreHref={null} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("InboxList rendering", () => {
  it("shows one header per date group, in order", () => {
    renderList();
    const headers = screen.getAllByText(/^(Aujourd'hui|Hier)$/);
    expect(headers.map((h) => h.textContent)).toEqual(["Aujourd'hui", "Hier"]);
  });

  it("marks the open message as selected", () => {
    renderList({ openId: "b" });
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual(["false", "true", "false"]);
  });

  it("falls back to a placeholder subject", () => {
    renderList({ rows: [row("x", { subject: "" })] });
    expect(screen.getByText("(sans objet)")).toBeTruthy();
  });
});

describe("InboxList keyboard navigation", () => {
  it("j/k and arrows move the cursor and stop at both ends", () => {
    renderList();
    press("j");
    expect(cursorRowId()).toBe("a");
    press("ArrowDown");
    press("j");
    press("j");
    expect(cursorRowId()).toBe("c");
    press("k");
    expect(cursorRowId()).toBe("b");
    press("ArrowUp");
    press("ArrowUp");
    expect(cursorRowId()).toBe("a");
  });

  it("Enter and o open the message under the cursor", () => {
    renderList();
    press("j");
    press("Enter");
    expect(router.push).toHaveBeenLastCalledWith("/?open=a");
    press("j");
    press("o");
    expect(router.push).toHaveBeenLastCalledWith("/?open=b");
  });

  it("Enter does nothing before any row is selected", () => {
    renderList();
    press("Enter");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("Escape closes the open message, and is left alone when nothing is open", () => {
    const { unmount } = renderList({ openId: "a", closeHref: "/?verdict=SPAM" });
    press("Escape");
    expect(router.push).toHaveBeenCalledWith("/?verdict=SPAM");
    unmount();

    router.push.mockClear();
    renderList();
    const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
    document.body.dispatchEvent(event);
    expect(router.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("ignores shortcuts while typing in a field or with a modifier held", () => {
    render(
      <>
        <input aria-label="search" />
        <InboxList rows={ROWS} closeHref="/" loadMoreHref={null} />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("search"), { key: "j" });
    expect(cursorRowId()).toBeNull();
    press("j", { ctrlKey: true });
    press("j", { metaKey: true });
    expect(cursorRowId()).toBeNull();
  });

  it("/ focuses the search field", () => {
    render(
      <>
        <input id="inbox-search" aria-label="search" />
        <InboxList rows={ROWS} closeHref="/" loadMoreHref={null} />
      </>,
    );
    press("/");
    expect(document.activeElement).toBe(screen.getByLabelText("search"));
  });

  it("? toggles the shortcut help, Escape closes it before closing the message", () => {
    renderList({ openId: "a" });
    press("?");
    expect(screen.getByRole("dialog", { name: "Raccourcis clavier" })).toBeTruthy();
    press("Escape");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("InboxList triage actions", () => {
  it("e quarantines the cursor row, moves to the next one and offers an undo", async () => {
    renderList();
    press("j");
    press("e");
    await flush();

    expect(actions.quarantineNow).toHaveBeenCalledWith("a");
    expect(screen.queryByText("Subject a")).toBeNull();
    expect(cursorRowId()).toBe("b");

    const [, options] = toast.success.mock.calls[0];
    expect(options.action.label).toBe("Annuler");
    await act(async () => options.action.onClick());
    expect(actions.restoreNow).toHaveBeenCalledWith("a");
    expect(screen.getByText("Subject a")).toBeTruthy();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("# and Suppr trash the cursor row", async () => {
    renderList();
    press("j");
    press("#");
    await flush();
    expect(actions.trashNow).toHaveBeenCalledWith("a");
    press("Delete");
    await flush();
    expect(actions.trashNow).toHaveBeenLastCalledWith("b");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("removing the open message opens the next one, or closes the pane after the last", async () => {
    renderList({ rows: [row("a"), row("b")], openId: "a" });
    press("#");
    await flush();
    expect(router.push).toHaveBeenLastCalledWith("/?open=b");
  });

  it("removing the last open message goes back to the list", async () => {
    renderList({ rows: [row("a")], openId: "a", closeHref: "/?verdict=SPAM" });
    press("e");
    await flush();
    expect(router.push).toHaveBeenLastCalledWith("/?verdict=SPAM");
  });

  it("puts the row back and reports the error when the server action fails", async () => {
    actions.trashNow.mockRejectedValueOnce(new Error("provider down"));
    renderList();
    press("j");
    press("#");
    await flush();
    expect(screen.getByText("Subject a")).toBeTruthy();
    expect(toast.error).toHaveBeenCalledWith("Impossible de mettre ce mail à la corbeille.");
  });

  it("row hover buttons trigger the same actions", async () => {
    renderList();
    const firstRow = document.querySelector('[data-row-id="b"]') as HTMLElement;
    fireEvent.click(within(firstRow).getByRole("button", { name: "Quarantaine (e)" }));
    await flush();
    expect(actions.quarantineNow).toHaveBeenCalledWith("b");
  });
});

describe("InboxList once every row is triaged", () => {
  async function emptyTheList(loadMoreHref: string | null = null) {
    renderList({ rows: [row("only")], loadMoreHref });
    press("j");
    press("e");
    await flush();
  }

  it("says so instead of showing a blank pane", async () => {
    await emptyTheList();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toContain("Tout est trié sur cette page");
  });

  it("points to the next page when there is one", async () => {
    await emptyTheList("/?cursor=abc");
    expect(screen.getByRole("status").textContent).toContain("Charge la suite");
    expect(screen.getByRole("link", { name: "Charger plus" }).getAttribute("href")).toBe("/?cursor=abc");
  });

  it("ignores navigation and action keys without throwing", async () => {
    await emptyTheList();
    vi.clearAllMocks();
    for (const key of ["j", "k", "ArrowDown", "ArrowUp", "Enter", "o", "e", "#", "Delete"]) press(key);
    await flush();
    expect(router.push).not.toHaveBeenCalled();
    expect(actions.quarantineNow).not.toHaveBeenCalled();
    expect(actions.trashNow).not.toHaveBeenCalled();
    expect(cursorRowId()).toBeNull();
  });
});
