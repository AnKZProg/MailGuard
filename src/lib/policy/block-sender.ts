import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { ensureSenderBlockFilter } from "@/lib/providers/google/gmail-settings-client";
import { ensureSenderBlockRule, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";

export type BlockScope = "ADDRESS" | "DOMAIN";

// fromAddress/fromDomain come straight from a header on a real, attacker-
// controlled email — parseAddressHeader only strips the surrounding
// "Name <...>" wrapper, it doesn't validate what's inside the brackets. Gmail's
// filter `from` criterion is parsed with the same query grammar as Gmail
// search (operators, parentheses, boolean terms), so a crafted header like
// `Foo <a@b.com) OR (to:` would otherwise become part of the actual filter
// query instead of a literal sender match. A plain address/domain shape never
// contains any of Gmail search's special characters, so this also doubles as
// a sanity check before the request is even sent, on both providers.
const ADDRESS_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/;

export function isSafeBlockPattern(scope: BlockScope, pattern: string): boolean {
  return scope === "ADDRESS" ? ADDRESS_PATTERN.test(pattern) : DOMAIN_PATTERN.test(pattern);
}

/**
 * Blocks a sender (address or whole domain) for one account: records the local
 * SenderPolicy (so MailGuard's own classifier always scores it as spam from now
 * on) and — best effort — installs a server-side Gmail filter or Outlook inbox
 * rule so future mail matching the pattern is intercepted by the provider
 * itself, even between MailGuard syncs. The provider-side step never fails the
 * whole operation: a missing scope or a transient API error still leaves the
 * local policy in place.
 */
export async function blockSenderPermanently(
  accountId: string,
  scope: BlockScope,
  pattern: string,
): Promise<{ providerRuleCreated: boolean }> {
  const account = await db.account.findUniqueOrThrow({ where: { id: accountId } });

  const existingPolicy = await db.senderPolicy.findFirst({ where: { scope, pattern, accountId } });
  if (!existingPolicy) {
    await db.senderPolicy.create({ data: { scope, pattern, verdict: "BLOCK", accountId } });
  } else if (existingPolicy.verdict !== "BLOCK") {
    await db.senderPolicy.update({ where: { id: existingPolicy.id }, data: { verdict: "BLOCK" } });
  }

  if (!isSafeBlockPattern(scope, pattern)) {
    console.error(`[block-sender] motif rejeté, forme inattendue pour un ${scope.toLowerCase()}: ${pattern}`);
    return { providerRuleCreated: false };
  }

  try {
    const accessToken = await getValidAccessToken(accountId);
    if (account.provider === "GOOGLE") {
      const matchValue = scope === "DOMAIN" ? `@${pattern}` : pattern;
      await ensureSenderBlockFilter(accessToken, matchValue);
    } else {
      const junkFolderId = await getWellKnownFolderId(accessToken, "junkemail");
      await ensureSenderBlockRule(accessToken, pattern, scope, junkFolderId);
    }
    return { providerRuleCreated: true };
  } catch (err) {
    console.error(`[block-sender] règle côté fournisseur échouée pour ${pattern}`, err);
    return { providerRuleCreated: false };
  }
}
