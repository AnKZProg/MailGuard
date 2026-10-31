// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SenderAvatar } from "./SenderAvatar";

function avatar(name: string | null, address: string) {
  const { container, unmount } = render(<SenderAvatar name={name} address={address} />);
  const el = container.firstElementChild as HTMLElement;
  const result = { text: el.textContent, color: el.style.backgroundColor, hidden: el.getAttribute("aria-hidden") };
  unmount();
  return result;
}

describe("SenderAvatar", () => {
  it("uses the initials of the first two words of the display name", () => {
    expect(avatar("Marie Curie", "m@x.fr").text).toBe("MC");
    expect(avatar("« La Poste »", "x@laposte.fr").text).toBe("LP");
  });

  it("falls back to the address local part", () => {
    expect(avatar(null, "newsletter@shop.com").text).toBe("NE");
    expect(avatar("   ", "zo@x.fr").text).toBe("ZO");
  });

  it("gives an address the same colour regardless of case, and is decorative", () => {
    const a = avatar("A", "Bob@Example.com");
    expect(a.color).toBe(avatar("B", "bob@example.com").color);
    expect(a.hidden).toBe("true");
  });
});
