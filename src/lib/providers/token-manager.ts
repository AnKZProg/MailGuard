import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/crypto/token-cipher";
import { refreshGoogleAccessToken, GoogleOAuthError } from "@/lib/providers/google/oauth";
import { refreshMicrosoftAccessToken, MicrosoftOAuthError } from "@/lib/providers/microsoft/oauth";

const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class AccountNeedsReconsentError extends Error {
  constructor(public readonly accountId: string) {
    super(`Le compte ${accountId} a besoin d'être reconnecté (consentement révoqué ou expiré).`);
    this.name = "AccountNeedsReconsentError";
  }
}

// Prevents two concurrent callers (e.g. overlapping sync ticks) from refreshing
// the same account's token at the same time and racing on the DB write.
const refreshLocks = new Map<string, Promise<string>>();

export async function getValidAccessToken(accountId: string): Promise<string> {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });

  const stillValid = account.tokenExpiresAt.getTime() - EXPIRY_SAFETY_MARGIN_MS > Date.now();
  if (stillValid) {
    return decryptToken(account.accessTokenEnc);
  }

  const inFlight = refreshLocks.get(accountId);
  if (inFlight) return inFlight;

  const refreshPromise = performRefresh(accountId, account.provider, account.refreshTokenEnc).finally(() => {
    refreshLocks.delete(accountId);
  });
  refreshLocks.set(accountId, refreshPromise);
  return refreshPromise;
}

async function performRefresh(accountId: string, provider: "GOOGLE" | "MICROSOFT", refreshTokenEnc: string): Promise<string> {
  const refreshToken = decryptToken(refreshTokenEnc);

  try {
    if (provider === "GOOGLE") {
      const tokens = await refreshGoogleAccessToken(refreshToken);
      await db.account.update({
        where: { id: accountId },
        data: {
          accessTokenEnc: encryptToken(tokens.access_token),
          // Google only rotates the refresh token occasionally — keep the existing
          // one unless a new one was actually issued.
          ...(tokens.refresh_token ? { refreshTokenEnc: encryptToken(tokens.refresh_token) } : {}),
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    }

    const tokens = await refreshMicrosoftAccessToken(refreshToken);
    if (!tokens.refresh_token) {
      throw new Error("Microsoft n'a pas renvoyé de nouveau refresh_token lors du rafraîchissement");
    }
    await db.account.update({
      where: { id: accountId },
      data: {
        accessTokenEnc: encryptToken(tokens.access_token),
        // Microsoft rotates the refresh token on every use — the old one becomes
        // invalid, so it MUST be overwritten every time, unlike Google.
        refreshTokenEnc: encryptToken(tokens.refresh_token),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
    return tokens.access_token;
  } catch (err) {
    const isInvalidGrant =
      (err instanceof GoogleOAuthError || err instanceof MicrosoftOAuthError) && err.message === "invalid_grant";

    if (isInvalidGrant) {
      await db.account.update({ where: { id: accountId }, data: { status: "NEEDS_RECONSENT" } });
      throw new AccountNeedsReconsentError(accountId);
    }

    await db.account.update({ where: { id: accountId }, data: { status: "ERROR" } });
    throw err;
  }
}
