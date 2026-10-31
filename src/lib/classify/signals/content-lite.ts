import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";
import {
  ANTIVIRUS_BRANDS,
  BANK_DETAILS_CHANGE_KEYWORDS,
  DELIVERY_FEE_KEYWORDS,
  PHISHING_SUBJECT_KEYWORDS,
  ROMANCE_SCAM_KEYWORDS,
  SPAM_SUBJECT_KEYWORDS,
  SUBSCRIPTION_LAPSE_KEYWORDS,
} from "@/lib/classify/config";

/**
 * Keyword matching on the subject, plus the provider's snippet for the
 * scam-opener rules — never the full body.
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

  // Person-to-person scams only: a newsletter or a provider notice ("you shared
  // data with WhatsApp") mentioning these words is not someone luring you.
  if (!features.isBulk) {
    const lure = firstHit(features, MESSAGING_APP_LURES);
    if (lure) signals.push(strangerSignal(features, "messaging_lure", lure, `t'invite à poursuivre sur ${lure}`));

    const romance = firstHit(features, ROMANCE_SCAM_KEYWORDS);
    if (romance) signals.push(strangerSignal(features, "romance_opener", romance, `ouvre la conversation par « ${romance} »`));

    const fee = firstHit(features, DELIVERY_FEE_KEYWORDS);
    if (fee) {
      signals.push({
        ruleId: "content.delivery_fee",
        category: "phishing",
        weight: 0.2,
        detail: `Réclame des « ${fee} »`,
      });
    }

    const bankChange = firstHit(features, BANK_DETAILS_CHANGE_KEYWORDS);
    if (bankChange) signals.push(bankDetailsChangeSignal(features, bankChange));
  }

  const antivirus = fakeAntivirusRenewal(features);
  if (antivirus) {
    signals.push({
      ruleId: "content.fake_antivirus_renewal",
      category: "phishing",
      weight: 0.6,
      detail: `Annonce la fin d'une protection ${antivirus} sans venir de ${antivirus}`,
    });
  }

  return signals;
}

/**
 * Payment diversion is the costliest scam there is, so even a known sender gets
 * a visible flag — their mailbox may be the one that was compromised.
 */
function bankDetailsChangeSignal(features: MessageFeatures, hit: string): Signal {
  return features.isFirstContact
    ? { ruleId: "content.bank_details_change_first_contact", category: "phishing", weight: 0.6, detail: `Expéditeur inconnu qui annonce un changement de « ${hit} » (détournement de paiement)` }
    : { ruleId: "content.bank_details_change", category: "phishing", weight: 0.3, detail: `Annonce un changement de « ${hit} » : vérifie par téléphone avant tout virement` };
}

function fakeAntivirusRenewal(features: MessageFeatures): string | undefined {
  const text = `${(features.fromDisplayName ?? "").toLowerCase()} ${features.subjectLower} ${features.snippetLower}`;
  const vendor = ANTIVIRUS_BRANDS.find(({ brand }) => new RegExp(`\\b${brand}\\b`).test(text));
  if (!vendor) return undefined;
  const domain = features.fromDomain.toLowerCase();
  if (vendor.domains.some((d) => domain === d || domain.endsWith(`.${d}`))) return undefined;
  return SUBSCRIPTION_LAPSE_KEYWORDS.some((k) => text.includes(k)) ? vendor.brand : undefined;
}

function firstHit(features: MessageFeatures, keywords: readonly string[]): string | undefined {
  return keywords.find((k) => features.subjectLower.includes(k) || features.snippetLower.includes(k));
}

/** Strong from a first-time sender (classic scam opener), merely explanatory from a known correspondent. */
function strangerSignal(features: MessageFeatures, rule: string, hit: string, what: string): Signal {
  return features.isFirstContact
    ? { ruleId: `content.${rule}_first_contact`, category: "spam", weight: 0.55, detail: `Expéditeur inconnu qui ${what} (arnaque classique)` }
    : { ruleId: `content.${rule}`, category: "spam", weight: 0.15, detail: `Mentionne « ${hit} »` };
}

/** Romance/crypto/job scams move the victim off email to an unmonitored chat app. */
const MESSAGING_APP_LURES = ["whatsapp", "telegram", "t.me/", "wechat", "viber"];
