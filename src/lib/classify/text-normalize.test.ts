import { describe, expect, it } from "vitest";
import { normalizeForMatching } from "./text-normalize";

// Built from String.fromCharCode, never the literal codepoint, so the test
// file itself never carries an actual invisible character.
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const ZERO_WIDTH_JOINER = String.fromCharCode(0x200d);
const BOM = String.fromCharCode(0xfeff);

describe("normalizeForMatching", () => {
  it("lowercases plain text", () => {
    expect(normalizeForMatching("PayPal Support")).toBe("paypal support");
  });

  it("strips a zero-width space hidden inside a brand name", () => {
    // A phishing sender's display name with an invisible character splitting
    // the brand — invisible to a human reader, but would defeat a plain
    // .includes("paypal") check without this normalization.
    const withZeroWidth = `Pay${ZERO_WIDTH_SPACE}Pal Support`;
    expect(normalizeForMatching(withZeroWidth)).toBe("paypal support");
  });

  it("strips a zero-width joiner and a BOM", () => {
    expect(normalizeForMatching(`Ama${ZERO_WIDTH_JOINER}zon${BOM}`)).toBe("amazon");
  });

  it("folds fullwidth Latin characters via NFKC normalization", () => {
    // U+FF41.. are fullwidth forms that render visually distinct from ASCII
    // but NFKC-normalize down to the plain letters.
    expect(normalizeForMatching("ＰａｙＰａｌ")).toBe("paypal");
  });

  it("leaves ordinary unicode text alone", () => {
    expect(normalizeForMatching("Café Résumé")).toBe("café résumé");
  });
});
