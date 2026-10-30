import { describe, expect, it } from "vitest";
import { inboxHref, parseInboxQuery } from "@/lib/queries/inbox-url";

describe("parseInboxQuery", () => {
  it("drops an unknown verdict instead of passing it to Prisma", () => {
    expect(parseInboxQuery({ verdict: "DROP TABLE" }).verdict).toBeUndefined();
    expect(parseInboxQuery({ verdict: "SPAM" }).verdict).toBe("SPAM");
  });

  it("trims the search, treats blank as no search, and caps its length", () => {
    expect(parseInboxQuery({ q: "   " }).q).toBeUndefined();
    expect(parseInboxQuery({ q: "  steam " }).q).toBe("steam");
    expect(parseInboxQuery({ q: "x".repeat(500) }).q).toHaveLength(200);
  });
});

describe("inboxHref", () => {
  it("keeps only set filters", () => {
    expect(inboxHref({})).toBe("/");
    expect(inboxHref({ verdict: "SPAM", q: undefined, open: "m1" })).toBe("/?verdict=SPAM&open=m1");
  });

  it("encodes the search text", () => {
    expect(inboxHref({ q: "a&b c" })).toBe("/?q=a%26b+c");
  });
});
