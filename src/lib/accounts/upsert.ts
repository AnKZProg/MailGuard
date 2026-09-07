import { db } from "@/lib/db";
import { encryptToken } from "@/lib/crypto/token-cipher";
import { colorTokenFor } from "@/lib/accounts/colors";
import type { $Enums } from "@prisma/client";

type UpsertAccountInput = {
  provider: $Enums.Provider;
  providerAccountId: string;
  emailAddress: string;
  displayName?: string;
  accessToken: string;
  /** Absent on a token refresh that didn't rotate the refresh token (Google's normal case). */
  refreshToken?: string;
  expiresInSeconds: number;
  scopes: string;
};

/**
 * Creates or updates an Account by [provider, providerAccountId]. Never clobbers an
 * existing refresh token with an empty value — Google only returns one on first
 * consent, so a reconnect without `prompt=consent` must not erase the stored one.
 */
export async function upsertAccount(input: UpsertAccountInput) {
  const accessTokenEnc = encryptToken(input.accessToken);
  const tokenExpiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);
  const existing = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
  });

  const refreshTokenEnc = input.refreshToken
    ? encryptToken(input.refreshToken)
    : (existing?.refreshTokenEnc ?? null);

  if (!refreshTokenEnc) {
    throw new Error(
      `Aucun refresh token disponible pour ${input.emailAddress} — reconnecte ce compte en forçant l'écran de consentement.`,
    );
  }

  return db.account.upsert({
    where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
    create: {
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      emailAddress: input.emailAddress,
      displayName: input.displayName,
      colorToken: colorTokenFor(input.providerAccountId),
      accessTokenEnc,
      refreshTokenEnc,
      tokenExpiresAt,
      scopes: input.scopes,
      status: "ACTIVE",
    },
    update: {
      emailAddress: input.emailAddress,
      displayName: input.displayName,
      accessTokenEnc,
      refreshTokenEnc,
      tokenExpiresAt,
      scopes: input.scopes,
      status: "ACTIVE",
    },
  });
}
