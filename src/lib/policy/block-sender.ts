import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { ensureSenderBlockFilter, removeSenderBlockFilter } from "@/lib/providers/google/gmail-settings-client";
import { ensureSenderBlockRule, removeSenderBlockRule, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";

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

/**
 * Reverses blockSenderPermanently: removes the local SenderPolicy row and,
 * best effort, the provider-side Gmail filter / Outlook rule installed
 * alongside it — without this second step, the provider would keep silently
 * trashing mail from this sender even though MailGuard no longer treats it
 * as blocked. Same trade-off as the block path: a failed provider-side
 * removal doesn't block deleting the local policy, since the alternative
 * (leaving the block in place because the provider call failed) is worse
 * than a stale provider rule the user can also remove by hand.
 */
export async function unblockSender(policyId: string): Promise<{ providerRuleRemoved: boolean }> {
  const policy = await db.senderPolicy.findUniqueOrThrow({ where: { id: policyId } });
  if (!policy.accountId) {
    await db.senderPolicy.delete({ where: { id: policyId } });
    return { providerRuleRemoved: false };
  }

  let providerRuleRemoved = false;
  try {
    const account = await db.account.findUniqueOrThrow({ where: { id: policy.accountId } });
    const accessToken = await getValidAccessToken(policy.accountId);
    if (account.provider === "GOOGLE") {
      const matchValue = policy.scope === "DOMAIN" ? `@${policy.pattern}` : policy.pattern;
      await removeSenderBlockFilter(accessToken, matchValue);
    } else {
      await removeSenderBlockRule(accessToken, policy.pattern, policy.scope);
    }
    providerRuleRemoved = true;
  } catch (err) {
    console.error(`[block-sender] suppression de la règle fournisseur échouée pour ${policy.pattern}`, err);
  }

  await db.senderPolicy.delete({ where: { id: policyId } });
  return { providerRuleRemoved };
}
