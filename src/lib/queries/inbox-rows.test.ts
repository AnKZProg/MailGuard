import { describe, expect, it } from "vitest";
import { cleanSnippet } from "@/lib/queries/inbox-rows";

describe("cleanSnippet", () => {
  it("decodes the HTML entities Gmail leaves in snippets", () => {
    expect(cleanSnippet("Voici votre code d&#39;accès &amp; plus")).toBe("Voici votre code d'accès & plus");
    expect(cleanSnippet("&lt;b&gt; &#x27;ok&#x27;")).toBe("<b> 'ok'");
  });

  it("strips invisible preview padding and collapses whitespace", () => {
    expect(cleanSnippet("Offre \u034F \u034F \u200C \u200C  fin")).toBe("Offre fin");
    expect(cleanSnippet(" \u034F \u200C ")).toBeNull();
  });

  it("leaves unknown entities alone rather than guessing", () => {
    expect(cleanSnippet("a &bogus; b")).toBe("a &bogus; b");
  });
});
