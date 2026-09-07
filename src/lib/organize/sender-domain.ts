import { parseAddressHeader, domainOf } from "@/lib/mail/headers";

/**
 * Extracts the sender's domain from a Gmail metadata response's raw "From"
 * header, via the same anchored parser the sync pipeline uses (mapper.ts) —
 * not an ad-hoc regex. A naive `/<([^>]+)>/` match (used here previously)
 * finds the FIRST bracketed substring anywhere in the string, which a
 * display name containing its own "<...>"-shaped text (e.g. a quoted
 * "Support <fake@x.com>" name ahead of the real address) would fool;
 * parseAddressHeader anchors the whole value and only takes the bracketed
 * part when it's genuinely the trailing address.
 */
export function gmailFromDomain(headers: { name: string; value: string }[] | undefined): string {
  const fromValue = headers?.find((h) => h.name.toLowerCase() === "from")?.value;
  const { address } = parseAddressHeader(fromValue);
  return domainOf(address);
}
