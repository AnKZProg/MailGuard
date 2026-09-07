// fromDisplayName/subject are fully attacker-controlled — a phishing sender
// can insert invisible characters (e.g. a zero-width space) into a brand name
// to defeat a plain `.includes("paypal")` check while a human reader sees
// nothing unusual, since mail clients render these characters as nothing.
// Built from a string of \u escapes (never the literal codepoints) so this
// stays legible in any editor/encoding instead of silently carrying invisible
// characters in the source file itself.
const INVISIBLE_CODEPOINTS = [
  "200B", // zero-width space
  "200C", // zero-width non-joiner
  "200D", // zero-width joiner
  "200E", // left-to-right mark
  "200F", // right-to-left mark
  "2060", // word joiner
  "FEFF", // zero-width no-break space / BOM
  "00AD", // soft hyphen
  "180E", // Mongolian vowel separator
];

const INVISIBLE_CHARS = new RegExp(`[${INVISIBLE_CODEPOINTS.map((cp) => `\\u${cp}`).join("")}]`, "g");

/** Lowercases and strips characters a brand-impersonation substring check
 * should never let a sender hide behind. NFKC also folds visually-similar
 * codepoints (e.g. fullwidth Latin letters) into their plain equivalents. */
export function normalizeForMatching(text: string): string {
  return text.normalize("NFKC").replace(INVISIBLE_CHARS, "").toLowerCase();
}
