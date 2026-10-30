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
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, appUrl);
    return NextResponse.redirect(target, 308);
  }
  return new NextResponse("Host non autorisé", { status: 421, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
