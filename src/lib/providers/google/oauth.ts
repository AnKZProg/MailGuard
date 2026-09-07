import { getEnv } from "@/lib/env";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
] as const;

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";

function redirectUri(): string {
  return `${getEnv().APP_URL}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string, codeChallenge: string): string {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export class GoogleOAuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export async function exchangeGoogleCode(code: string, codeVerifier: string): Promise<GoogleTokenResponse> {
  const env = getEnv();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
    }),
  });
  if (!response.ok) {
    throw new GoogleOAuthError(`Échange du code d'autorisation Google échoué (${response.status})`, await safeJson(response));
  }
  return response.json() as Promise<GoogleTokenResponse>;
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const env = getEnv();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    const body = await safeJson(response);
    const isInvalidGrant = typeof body === "object" && body !== null && (body as { error?: string }).error === "invalid_grant";
    throw new GoogleOAuthError(
      isInvalidGrant ? "invalid_grant" : `Rafraîchissement du token Google échoué (${response.status})`,
      body,
    );
  }
  return response.json() as Promise<GoogleTokenResponse>;
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new GoogleOAuthError(`Récupération du profil Google échouée (${response.status})`, await safeJson(response));
  }
  return response.json() as Promise<GoogleUserInfo>;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
