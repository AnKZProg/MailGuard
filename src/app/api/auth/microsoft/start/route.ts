import { NextResponse } from "next/server";
import { buildMicrosoftAuthUrl } from "@/lib/providers/microsoft/oauth";
import { generateState, generateCodeVerifier, deriveCodeChallenge } from "@/lib/oauth/pkce";
import { setFlowCookie } from "@/lib/oauth/flow-cookie";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = deriveCodeChallenge(codeVerifier);

  await setFlowCookie("microsoft", { state, codeVerifier });

  return NextResponse.redirect(buildMicrosoftAuthUrl(state, codeChallenge));
}
