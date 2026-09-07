import { getEnv } from "@/lib/env";

export const MICROSOFT_SCOPES = [
  "https://graph.microsoft.com/Mail.ReadWrite",
  "https://graph.microsoft.com/MailboxSettings.Read",
  "https://graph.microsoft.com/User.Read",
  "offline_access",
] as const;

const AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const AUTH_ENDPOINT = `${AUTHORITY}/authorize`;
const TOKEN_ENDPOINT = `${AUTHORITY}/token`;
const ME_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

function redirectUri(): string {
  return `${getEnv().APP_URL}/api/auth/microsoft/callback`;
}

export function buildMicrosoftAuthUrl(state: string, codeChallenge: string): string {
  const env = getEnv();
  const params = new URLSearchParams({
    client_id: env.MICROSOFT_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export class MicrosoftOAuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MicrosoftOAuthError";
  }
}

export async function exchangeMicrosoftCode(code: string, codeVerifier: string): Promise<MicrosoftTokenResponse> {
  const env = getEnv();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      scope: MICROSOFT_SCOPES.join(" "),
    }),
  });
  if (!response.ok) {
    throw new MicrosoftOAuthError(
      `Échange du code d'autorisation Microsoft échoué (${response.status})`,
      await safeJson(response),
    );
  }
  return response.json() as Promise<MicrosoftTokenResponse>;
}

/**
 * Microsoft rotates the refresh token on every use — the response's refresh_token
 * MUST replace the stored one every time, unlike Google which only issues one on
 * first consent. Callers must always persist the returned refresh_token.
 */
export async function refreshMicrosoftAccessToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  const env = getEnv();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      client_secret: env.MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: MICROSOFT_SCOPES.join(" "),
    }),
  });
  if (!response.ok) {
    const body = await safeJson(response);
    const isInvalidGrant = typeof body === "object" && body !== null && (body as { error?: string }).error === "invalid_grant";
    throw new MicrosoftOAuthError(
      isInvalidGrant ? "invalid_grant" : `Rafraîchissement du token Microsoft échoué (${response.status})`,
      body,
    );
  }
  return response.json() as Promise<MicrosoftTokenResponse>;
}

export type MicrosoftUserInfo = {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName?: string;
};

export async function fetchMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const response = await fetch(ME_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new MicrosoftOAuthError(`Récupération du profil Microsoft échouée (${response.status})`, await safeJson(response));
  }
  return response.json() as Promise<MicrosoftUserInfo>;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
