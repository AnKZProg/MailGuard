import { NextResponse, type NextRequest } from "next/server";
import { decideHost } from "@/lib/http/host-guard";

// Binding to 127.0.0.1 does not stop DNS rebinding: a hostile page whose domain
// re-resolves to 127.0.0.1 is "same-origin" with itself, so Next's Server Action
// Origin==Host check passes and it can read every page. Only the Host header
// tells that request apart from a real one.
export function proxy(request: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
  const decision = decideHost(request.headers.get("host"), appUrl);

  if (decision === "allow") return NextResponse.next();
  if (decision === "canonicalize") {
    // Not a 3xx: Next treats localhost and 127.0.0.1 as the same origin and
    // rewrites any proxy Location header to a relative "/", which would loop.
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, appUrl).toString();
    return new NextResponse(canonicalRedirectPage(target), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new NextResponse("Host non autorisé", { status: 421, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

function canonicalRedirectPage(target: string): string {
  const escaped = target.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${escaped}"><title>MailGuard</title><p>Redirection vers <a href="${escaped}">${escaped}</a>…</p>`;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
