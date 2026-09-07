import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { consumeFlowCookie } from "@/lib/oauth/flow-cookie";
import { exchangeGoogleCode, fetchGoogleUserInfo, GOOGLE_SCOPES } from "@/lib/providers/google/oauth";
import { upsertAccount } from "@/lib/accounts/upsert";

function accountsRedirect(request: Request, params: Record<string, string>): NextResponse {
  const url = new URL("/accounts", getEnv().APP_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const flow = await consumeFlowCookie("google");

  if (error) {
    return accountsRedirect(request, { error: "google_denied" });
  }
  if (!flow || !returnedState || returnedState !== flow.state) {
    return accountsRedirect(request, { error: "google_invalid_state" });
  }
  if (!code) {
    return accountsRedirect(request, { error: "google_missing_code" });
  }

  try {
    const tokens = await exchangeGoogleCode(code, flow.codeVerifier);
    const profile = await fetchGoogleUserInfo(tokens.access_token);

    if (!tokens.refresh_token) {
      // Happens if the user has an existing, still-valid consent grant that Google
      // decided not to re-issue a refresh token for. upsertAccount will fall back to
      // the previously stored one; if there isn't one, it throws with a clear message.
    }

    await upsertAccount({
      provider: "GOOGLE",
      providerAccountId: profile.sub,
      emailAddress: profile.email,
      displayName: profile.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope || GOOGLE_SCOPES.join(" "),
    });

    return accountsRedirect(request, { connected: "google" });
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return accountsRedirect(request, { error: "google_exchange_failed" });
  }
}
