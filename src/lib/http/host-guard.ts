export type HostDecision = "allow" | "canonicalize" | "reject";

const LOOPBACK_ALIASES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * `allow` only the exact host of APP_URL. Another loopback alias on the same port
 * is `canonicalize`d (redirected) rather than served, because the OAuth flow
 * cookie and redirect_uri are bound to APP_URL's host — serving `localhost`
 * would silently break "Connect account" with an invalid-state error.
 */
export function decideHost(hostHeader: string | null, appUrl: string): HostDecision {
  if (!hostHeader) return "reject";
  const app = new URL(appUrl);
  const host = hostHeader.toLowerCase();
  if (host === app.host.toLowerCase()) return "allow";

  let parsed: URL;
  try {
    parsed = new URL(`http://${host}`);
  } catch {
    return "reject";
  }
  if (LOOPBACK_ALIASES.has(parsed.hostname) && LOOPBACK_ALIASES.has(app.hostname) && parsed.port === app.port) {
    return "canonicalize";
  }
  return "reject";
}
