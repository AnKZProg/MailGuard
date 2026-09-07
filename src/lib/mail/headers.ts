/** Parses a "Display Name <address@domain>" or bare "address@domain" header value. */
export function parseAddressHeader(value: string | undefined | null): { name: string | null; address: string } {
  if (!value) return { name: null, address: "" };
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (match) {
    const name = match[1]?.trim();
    return { name: name ? name : null, address: match[2].trim().toLowerCase() };
  }
  return { name: null, address: value.trim().toLowerCase() };
}

export function domainOf(address: string): string {
  const at = address.lastIndexOf("@");
  return at === -1 ? "" : address.slice(at + 1).toLowerCase();
}

type AuthResults = { spf: string | null; dkim: string | null; dmarc: string | null };

/**
 * Extracts spf/dkim/dmarc verdicts from an `Authentication-Results` header, e.g.
 * "mx.google.com; spf=pass ...; dkim=pass ...; dmarc=fail (p=REJECT) ...".
 * Returns null for a mechanism the header doesn't mention.
 */
export function parseAuthenticationResults(headerValue: string | undefined | null): AuthResults {
  if (!headerValue) return { spf: null, dkim: null, dmarc: null };
  const extract = (mechanism: "spf" | "dkim" | "dmarc"): string | null => {
    const match = headerValue.match(new RegExp(`${mechanism}=([a-zA-Z-]+)`, "i"));
    return match ? match[1].toLowerCase() : null;
  };
  return { spf: extract("spf"), dkim: extract("dkim"), dmarc: extract("dmarc") };
}

export function countRecipients(headerValue: string | undefined | null): number {
  if (!headerValue) return 0;
  // Naive split on top-level commas is good enough here — recipient headers rarely
  // contain quoted display names with embedded commas, and undercounting by one
  // in that edge case doesn't change any classification signal.
  return headerValue.split(",").filter((part) => part.trim().length > 0).length;
}
