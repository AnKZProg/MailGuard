import { getEnv } from "@/lib/env";

/**
 * Route Handlers (unlike Server Actions) get no automatic same-origin check from
 * Next.js. Any page open in the same browser can POST to a plain route handler,
 * so state-changing ones must verify Origin/Referer themselves.
 */
export function isSameOriginRequest(request: Request): boolean {
  const appOrigin = new URL(getEnv().APP_URL).origin;
  const origin = request.headers.get("origin");
  if (origin) return origin === appOrigin;

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }

  // No Origin and no Referer: not a browser cross-site request (e.g. same-process
  // tooling). Browsers always send Origin on same-site POSTs, so refusing here
  // would only break non-browser callers we don't have.
  return true;
}
