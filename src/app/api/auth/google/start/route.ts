import { NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/providers/google/oauth";
import { generateState, generateCodeVerifier, deriveCodeChallenge } from "@/lib/oauth/pkce";
import { setFlowCookie } from "@/lib/oauth/flow-cookie";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = deriveCodeChallenge(codeVerifier);

  await setFlowCookie("google", { state, codeVerifier });

  return NextResponse.redirect(buildGoogleAuthUrl(state, codeChallenge));
}
