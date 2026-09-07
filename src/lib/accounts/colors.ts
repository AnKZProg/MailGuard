// Stable per-account color tokens, referenced by CSS custom properties defined
// in globals.css (--account-color-0 .. --account-color-7). Deterministic hashing
// keeps the same account the same color across reconnects.
const PALETTE_SIZE = 8;

export function colorTokenFor(providerAccountId: string): string {
  let hash = 0;
  for (let i = 0; i < providerAccountId.length; i++) {
    hash = (hash * 31 + providerAccountId.charCodeAt(i)) >>> 0;
  }
  return `account-${hash % PALETTE_SIZE}`;
}
