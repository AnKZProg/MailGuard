import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { consumeFlowCookie } from "@/lib/oauth/flow-cookie";
import { exchangeMicrosoftCode, fetchMicrosoftUserInfo, MICROSOFT_SCOPES } from "@/lib/providers/microsoft/oauth";
import { upsertAccount } from "@/lib/accounts/upsert";

function accountsRedirect(params: Record<string, string>): NextResponse {
  const url = new URL("/accounts", getEnv().APP_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const flow = await consumeFlowCookie("microsoft");

  if (error) {
    return accountsRedirect({ error: "microsoft_denied" });
  }
  if (!flow || !returnedState || returnedState !== flow.state) {
    return accountsRedirect({ error: "microsoft_invalid_state" });
  }
  if (!code) {
    return accountsRedirect({ error: "microsoft_missing_code" });
  }

  try {
    const tokens = await exchangeMicrosoftCode(code, flow.codeVerifier);
    const profile = await fetchMicrosoftUserInfo(tokens.access_token);

    if (!tokens.refresh_token) {
      throw new Error("Microsoft n'a renvoyé aucun refresh_token — offline_access est-il bien dans les scopes demandés ?");
    }

    await upsertAccount({
      provider: "MICROSOFT",
      providerAccountId: profile.id,
      emailAddress: profile.mail ?? profile.userPrincipalName,
      displayName: profile.displayName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresInSeconds: tokens.expires_in,
      scopes: tokens.scope || MICROSOFT_SCOPES.join(" "),
    });

    return accountsRedirect({ connected: "microsoft" });
  } catch (err) {
    console.error("[auth/microsoft/callback]", err);
    return accountsRedirect({ error: "microsoft_exchange_failed" });
  }
}
