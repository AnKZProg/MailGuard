import { db } from "@/lib/db";
import { extractFeatures } from "@/lib/classify/features";
import { classify, type PolicyOverride, type Verdict } from "@/lib/classify/score";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";
import { quarantineMessage } from "@/lib/quarantine/quarantine";
import { archiveNewsletterMessage } from "@/lib/classify/archive-newsletter";

async function resolvePolicyOverride(accountId: string, fromAddress: string, fromDomain: string): Promise<PolicyOverride> {
  const policies = await db.senderPolicy.findMany({
    where: { OR: [{ accountId }, { accountId: null }] },
  });
  // Address-level policies take priority over domain-level ones; account-scoped over global.
  const matches = policies.filter(
    (p) => (p.scope === "ADDRESS" && p.pattern === fromAddress) || (p.scope === "DOMAIN" && p.pattern === fromDomain),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const scopeRank = (p: typeof a) => (p.scope === "ADDRESS" ? 0 : 1);
    const accountRank = (p: typeof a) => (p.accountId ? 0 : 1);
    return scopeRank(a) - scopeRank(b) || accountRank(a) - accountRank(b);
  });
  return matches[0].verdict;
}

/** Extracts features, scores the message, persists the verdict + signals, and (unless
 * shadow mode is on) hands off to the quarantine engine for spam/phishing verdicts.
 * Returns the verdict so callers that need it (e.g. a reclassification sweep counting
 * how many messages are now flagged) don't have to re-fetch the message afterward. */
export async function classifyAndPersist(messageId: string): Promise<{ verdict: Verdict }> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId } });

  const policyOverride = await resolvePolicyOverride(message.accountId, message.fromAddress, message.fromDomain);
  const features = extractFeatures(message);
  const result = classify(features, policyOverride);

  await db.$transaction([
    db.message.update({
      where: { id: messageId },
      data: { verdict: result.verdict, score: result.score, classifiedAt: new Date() },
    }),
    // Reclassification (e.g. a maintenance re-scan) must not pile up duplicate
    // signal rows alongside the previous pass's — clear first, same transaction.
    db.messageSignal.deleteMany({ where: { messageId } }),
    db.messageSignal.createMany({
      data: result.signals.map((signal) => ({
        messageId,
        ruleId: signal.ruleId,
        label: signal.category,
        weight: signal.weight,
        detail: signal.detail,
      })),
    }),
  ]);

  if (await isShadowModeEnabled()) return { verdict: result.verdict };

  try {
    if (result.shouldQuarantine) {
      await quarantineMessage(messageId, result.verdict === "PHISHING" ? "phishing" : "spam");
    } else if (result.verdict === "NEWSLETTER") {
      await archiveNewsletterMessage(messageId);
    }
  } catch (err) {
    // The provider action already retried transient failures with backoff —
    // if it still failed, don't let it propagate: the sync loop that calls
    // this per message has no per-message try/catch, so an uncaught throw
    // here would abort classification for every message still queued after
    // this one in the batch. Clearing classifiedAt instead means this
    // specific message is picked up again (classification AND the action
    // both retried) on the next sync, rather than staying stuck forever with
    // a verdict that was never actually acted on.
    console.error(`[classify] action post-classification échouée pour ${messageId}, nouvelle tentative au prochain sync`, err);
    await db.message.update({ where: { id: messageId }, data: { classifiedAt: null } }).catch(() => {});
  }

  return { verdict: result.verdict };
}
