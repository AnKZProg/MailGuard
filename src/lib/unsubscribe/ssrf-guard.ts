import dns from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

/**
 * A List-Unsubscribe URL comes straight from a header on a real, attacker-
 * controlled email (any sender can put anything there) and this app runs on
 * 127.0.0.1, often alongside other local dev servers/services on the same
 * machine — without this check, a crafted unsubscribe link pointing at
 * `http://127.0.0.1:<other-port>/...` or a cloud metadata address would be
 * fetched automatically (with a real POST body, for the one-click case) the
 * moment the user clicks "Unsubscribe".
 */
function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) || // link-local, includes 169.254.169.254 cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fe80:") || // link-local
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") || // unique local
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

function isPrivateIp(ip: string): boolean {
  if (isIPv4(ip)) return isPrivateIPv4(ip);
  if (isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unrecognized shape — fail closed
}

/** Resolves the URL's hostname and rejects it if it (or anything it resolves
 * to) is loopback/private/link-local. Throws on rejection — callers should
 * treat that the same as any other failed unsubscribe attempt. */
export async function assertPublicHttpUrl(rawUrl: string): Promise<void> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("schéma d'URL non autorisé");
  }
  if (url.hostname === "localhost") {
    throw new Error("cible locale non autorisée");
  }

  const literalIp = isIPv4(url.hostname) || isIPv6(url.hostname) ? url.hostname : null;
  const addresses = literalIp ? [literalIp] : (await dns.lookup(url.hostname, { all: true })).map((a) => a.address);

  if (addresses.length === 0 || addresses.some(isPrivateIp)) {
    throw new Error("cible réseau locale/privée non autorisée");
  }
}
