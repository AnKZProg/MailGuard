import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";
import { PHISHING_SUBJECT_KEYWORDS, SPAM_SUBJECT_KEYWORDS } from "@/lib/classify/config";

/**
 * Keyword matching on the SUBJECT LINE ONLY — never the body. The subject is
 * structured metadata returned by the list/metadata API calls, not content the
 * classifier "reads" as free text from the message body.
 */
export function contentLiteSignals(features: MessageFeatures): Signal[] {
  const signals: Signal[] = [];

  const phishingHit = PHISHING_SUBJECT_KEYWORDS.find((keyword) => features.subjectLower.includes(keyword));
  if (phishingHit) {
    signals.push({
      ruleId: "content.phishing_keyword",
      category: "phishing",
      weight: 0.2,
      detail: `Sujet contient "${phishingHit}"`,
    });
  }

  const spamHit = SPAM_SUBJECT_KEYWORDS.find((keyword) => features.subjectLower.includes(keyword));
  if (spamHit) {
    signals.push({
      ruleId: "content.spam_keyword",
      category: "spam",
      weight: 0.25,
      detail: `Sujet contient "${spamHit}"`,
    });
  }

  return signals;
}
