import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal, SignalCategory } from "@/lib/classify/signal";
import { THRESHOLDS } from "@/lib/classify/config";
import { authSignals } from "@/lib/classify/signals/auth";
import { identitySignals } from "@/lib/classify/signals/identity";
import { bulkSignals } from "@/lib/classify/signals/bulk";
import { providerSignals } from "@/lib/classify/signals/provider";
import { contentLiteSignals } from "@/lib/classify/signals/content-lite";
import { attachmentSignals } from "@/lib/classify/signals/attachments";
import type { LearnedPrediction } from "@/lib/classify/learner/bayes";

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
export function classify(
  features: MessageFeatures,
  policyOverride: PolicyOverride,
  learned: LearnedPrediction | null = null,
): ClassificationResult {
  const signals = collectSignals(features);

  if (policyOverride === "ALLOW") {
    return { verdict: "LEGITIMATE", score: 0, signals, shouldQuarantine: false };
  }
  if (policyOverride === "BLOCK") {
    return { verdict: "SPAM", score: 1, signals, shouldQuarantine: true };
  }

  const ruleResult = classifyByRules(signals);
  if (!learned || learned.verdict === ruleResult.verdict || !learnerMayOverride(ruleResult, learned)) {
    return ruleResult;
  }

  const learnedSignal: Signal = {
    ruleId: "learned.user_feedback",
    category: "learned",
    weight: learned.probability,
    detail: `Appris de tes corrections : ressemble à « ${VERDICT_LABEL[learned.verdict]} »`,
  };
  const junk = learned.verdict === "SPAM" || learned.verdict === "PHISHING";
  return {
    verdict: learned.verdict,
    score: learned.probability,
    signals: [...signals, learnedSignal],
    shouldQuarantine: junk,
  };
}

const VERDICT_LABEL: Record<Verdict, string> = {
  LEGITIMATE: "Légitime",
  NEWSLETTER: "Newsletter",
  SPAM: "Spam",
  PHISHING: "Phishing",
};

/** Held-out test on real mail: 0 legitimate messages pushed to spam at ≥ 0.97. */
const LEARNED_MIN_PROBABILITY = 0.97;
/** Clearing a rule-made junk verdict lets mail through, so it needs more certainty. */
const LEARNED_MIN_PROBABILITY_TO_CLEAR_JUNK = 0.995;
/** A strong phishing verdict is never undone by the learner — use "Autoriser" for that. */
const PHISHING_SCORE_LEARNER_CANNOT_CLEAR = 0.8;
/**
 * The learner only sees words. Measured on the real mailbox, 13 of the 14 junk
 * verdicts it had cleared were mail Gmail itself had filed as spam (fake Norton
 * renewals, a rent bank-details fraud…): rare scam tokens look "legitimate" to a
 * model trained on 240 kept mails vs. thousands of spam. The provider's own spam
 * verdict is outside evidence the learner must not overrule.
 */
const EVIDENCE_LEARNER_CANNOT_CLEAR = new Set(["provider.spam_flag"]);

function learnerMayOverride(rule: ClassificationResult, learned: LearnedPrediction): boolean {
  const ruleJunk = rule.verdict === "SPAM" || rule.verdict === "PHISHING";
  const learnedJunk = learned.verdict === "SPAM" || learned.verdict === "PHISHING";
  if (rule.verdict === "PHISHING" && rule.score >= PHISHING_SCORE_LEARNER_CANNOT_CLEAR && !learnedJunk) return false;
  if (ruleJunk && !learnedJunk && rule.signals.some((s) => EVIDENCE_LEARNER_CANNOT_CLEAR.has(s.ruleId))) return false;
  const needed = ruleJunk && !learnedJunk ? LEARNED_MIN_PROBABILITY_TO_CLEAR_JUNK : LEARNED_MIN_PROBABILITY;
  return learned.probability >= needed;
}

function classifyByRules(signals: Signal[]): ClassificationResult {
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
