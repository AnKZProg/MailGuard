import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal, SignalCategory } from "@/lib/classify/signal";
import { THRESHOLDS } from "@/lib/classify/config";
import { authSignals } from "@/lib/classify/signals/auth";
import { identitySignals } from "@/lib/classify/signals/identity";
import { bulkSignals } from "@/lib/classify/signals/bulk";
import { providerSignals } from "@/lib/classify/signals/provider";
import { contentLiteSignals } from "@/lib/classify/signals/content-lite";
import { attachmentSignals } from "@/lib/classify/signals/attachments";

export type Verdict = "LEGITIMATE" | "NEWSLETTER" | "SPAM" | "PHISHING";

export type ClassificationResult = {
  verdict: Verdict;
  score: number;
  signals: Signal[];
  shouldQuarantine: boolean;
};

const SIGNAL_SOURCES = [authSignals, identitySignals, bulkSignals, providerSignals, contentLiteSignals, attachmentSignals];

function collectSignals(features: MessageFeatures): Signal[] {
  return SIGNAL_SOURCES.flatMap((source) => source(features));
}

function categoryScore(signals: Signal[], category: SignalCategory): number {
  const sum = signals.filter((s) => s.category === category).reduce((total, s) => total + s.weight, 0);
  return Math.min(1, sum);
}

export type PolicyOverride = "ALLOW" | "BLOCK" | null;

/**
 * Runs the full signal set and decides a verdict. `policyOverride` comes from
 * SenderPolicy (the user's explicit allow/block list) and always wins over the
 * signal-based score: an allowlisted sender can never land as SPAM/PHISHING, and a
 * blocked sender always does, regardless of what the signals say.
 */
export function classify(features: MessageFeatures, policyOverride: PolicyOverride): ClassificationResult {
  const signals = collectSignals(features);

  if (policyOverride === "ALLOW") {
    return { verdict: "LEGITIMATE", score: 0, signals, shouldQuarantine: false };
  }
  if (policyOverride === "BLOCK") {
    return { verdict: "SPAM", score: 1, signals, shouldQuarantine: true };
  }

  const phishingScore = categoryScore(signals, "phishing");
  const spamScore = categoryScore(signals, "spam");
  const newsletterScore = categoryScore(signals, "newsletter");

  if (phishingScore >= THRESHOLDS.phishing) {
    return { verdict: "PHISHING", score: phishingScore, signals, shouldQuarantine: true };
  }
  if (spamScore >= THRESHOLDS.spam) {
    return { verdict: "SPAM", score: spamScore, signals, shouldQuarantine: true };
  }
  if (newsletterScore >= THRESHOLDS.newsletter) {
    return { verdict: "NEWSLETTER", score: newsletterScore, signals, shouldQuarantine: false };
  }
  return { verdict: "LEGITIMATE", score: Math.max(phishingScore, spamScore, newsletterScore), signals, shouldQuarantine: false };
}
