import type { ClassificationResult, PolicyOverride, Verdict } from "@/lib/classify/score";
import type { Signal } from "@/lib/classify/signal";

/**
 * "Allowlist only" mode, per mailbox: for a box whose address leaked so widely
 * that blocking senders one by one is hopeless (spam lists rotate senders
 * endlessly), only known senders reach the inbox. Everything else is
 * quarantined — i.e. moved to the provider's Trash, still restorable.
 *
 * A sender is "known" when it has an ALLOW SenderPolicy, or when the user
 * already confirmed one of its messages as legitimate/newsletter. The
 * confirmation is matched on the exact address, never the whole domain, so
 * confirming one gmail.com contact doesn't open the box to all of gmail.com.
 *
 * Only mail received after the mode was turned on is affected, so a
 * maintenance re-scan can't suddenly quarantine a box's whole history.
 */
export const ALLOWLIST_ONLY_RULE_ID = "policy.allowlist_only";

export type AllowlistOnlyInput = {
  /** When the mode was turned on for this message's box; undefined = mode off. */
  enabledSince: Date | undefined;
  receivedAt: Date;
  policyOverride: PolicyOverride;
  /** A verdict the user set by hand on this exact message. */
  userVerdict: Verdict | null;
  /** The user already confirmed this exact sender address as legitimate/newsletter on this box. */
  senderConfirmed: boolean;
};

export function isUnknownSenderUnderAllowlist(input: AllowlistOnlyInput): boolean {
  if (!input.enabledSince) return false;
  if (input.receivedAt < input.enabledSince) return false;
  // ALLOW lets it through; BLOCK already quarantines on its own.
  if (input.policyOverride) return false;
  if (input.userVerdict) return false;
  return !input.senderConfirmed;
}

const UNKNOWN_SENDER_SIGNAL: Signal = {
  ruleId: ALLOWLIST_ONLY_RULE_ID,
  category: "spam",
  weight: 1,
  detail: "Expéditeur inconnu : la liste blanche est active sur cette boîte",
};

export function quarantineAsUnknownSender(result: ClassificationResult): ClassificationResult {
  return {
    ...result,
    verdict: result.verdict === "PHISHING" ? "PHISHING" : "SPAM",
    score: Math.max(result.score, 1),
    signals: [...result.signals, UNKNOWN_SENDER_SIGNAL],
    shouldQuarantine: true,
  };
}
