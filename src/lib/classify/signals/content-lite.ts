import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";
import { PHISHING_SUBJECT_KEYWORDS, SPAM_SUBJECT_KEYWORDS } from "@/lib/classify/config";

/**
 * Keyword matching on the subject, plus the provider's snippet for the
 * messaging-app lure only — never the full body.
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

  const lureHit = MESSAGING_APP_LURES.find(
    (app) => features.subjectLower.includes(app) || features.snippetLower.includes(app),
  );
  if (lureHit) {
    signals.push(
      features.isFirstContact
        ? {
            ruleId: "content.messaging_lure_first_contact",
            category: "spam",
            weight: 0.55,
            detail: `Expéditeur inconnu qui t'invite à poursuivre sur ${lureHit} (arnaque classique)`,
          }
        : {
            ruleId: "content.messaging_lure",
            category: "spam",
            weight: 0.15,
            detail: `Mentionne ${lureHit}`,
          },
    );
  }

  return signals;
}

/** Romance/crypto/job scams move the victim off email to an unmonitored chat app. */
const MESSAGING_APP_LURES = ["whatsapp", "telegram", "t.me/", "wechat", "viber"];
