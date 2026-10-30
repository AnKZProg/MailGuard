import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";
import { levenshteinDistance } from "@/lib/classify/levenshtein";
import { normalizeForMatching } from "@/lib/classify/text-normalize";
import { PROTECTED_DOMAINS, BRAND_ALIASES } from "@/lib/classify/config";

function domainMatchesAny(domain: string, allowedDomains: string[]): boolean {
  return allowedDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

const MAX_LOOKALIKE_DISTANCE = 2;
/** Short brands ("edf", "caf", "dhl") only match as a whole word — as substrings they hit "café", "cafétéria"… */
const MIN_COMPACT_BRAND_LENGTH = 6;
/** Only long brands get typo tolerance: one edit on a short word is a different word. */
const MIN_FUZZY_BRAND_LENGTH = 7;
const NON_WORD = /[^\p{L}\p{N}]+/gu;

const compact = (text: string) => normalizeForMatching(text).replace(NON_WORD, "");

/**
 * Brand mention that survives the usual evasions: "PrimeVideo" (no space),
 * "Prime-Video", and one-letter typos like "primvideo".
 */
export function mentionsBrand(text: string, brand: string): boolean {
  if (!text) return false;
  const words = normalizeForMatching(text).split(NON_WORD).filter(Boolean);
  const brandCompact = compact(brand);
  if (brandCompact.length < MIN_COMPACT_BRAND_LENGTH) {
    const brandWords = normalizeForMatching(brand).split(NON_WORD).filter(Boolean);
    return words.some((_, i) => brandWords.every((bw, j) => words[i + j] === bw));
  }
  if (compact(text).includes(brandCompact)) return true;
  if (brandCompact.length < MIN_FUZZY_BRAND_LENGTH) return false;
  return words.some(
    (word) => Math.abs(word.length - brandCompact.length) <= 1 && levenshteinDistance(word, brandCompact) <= 1,
  );
}

/** True if `domain` is close enough to `protectedDomain` to be a plausible typosquat, but not identical. */
function isLookalike(domain: string, protectedDomain: string): boolean {
  if (domain === protectedDomain) return false;
  if (domain.endsWith(`.${protectedDomain}`)) return false; // legitimate subdomain
  if (Math.abs(domain.length - protectedDomain.length) > MAX_LOOKALIKE_DISTANCE) return false;
  return levenshteinDistance(domain, protectedDomain) <= MAX_LOOKALIKE_DISTANCE;
}

export function identitySignals(features: MessageFeatures): Signal[] {
  const signals: Signal[] = [];

  for (const protectedDomain of PROTECTED_DOMAINS) {
    if (isLookalike(features.fromDomain, protectedDomain)) {
      signals.push({
        ruleId: "identity.lookalike_domain",
        category: "phishing",
        weight: 0.45,
        detail: `Domaine "${features.fromDomain}" ressemble à "${protectedDomain}"`,
      });
      break; // one match is enough signal, no need to stack multiple near-identical hits
    }
  }

  const displayName = features.fromDisplayName ?? "";
  for (const { brand, domains } of BRAND_ALIASES) {
    if (domainMatchesAny(features.fromDomain, domains)) continue; // legitimately theirs, not impersonation

    if (mentionsBrand(displayName, brand)) {
      signals.push({
        ruleId: "identity.display_name_impersonation",
        category: "phishing",
        weight: 0.35,
        detail: `Nom affiché évoque "${brand}" mais le domaine est "${features.fromDomain}"`,
      });
      break;
    }
  }

  // A subject mentioning a brand from a domain with zero relation to that brand
  // doesn't need a lookalike domain to be phishing — "PrimeVideo" sent from
  // approve-it.net has no textual resemblance to amazon.com at all.
  for (const { brand, domains } of BRAND_ALIASES) {
    if (domainMatchesAny(features.fromDomain, domains)) continue;

    if (mentionsBrand(features.subjectLower, brand)) {
      signals.push({
        ruleId: "identity.brand_mention_domain_mismatch",
        category: "phishing",
        weight: 0.35,
        detail: `Sujet évoque "${brand}" mais l'expéditeur est "${features.fromDomain}"`,
      });
      break;
    }
  }

  // Newsletters legitimately talk about other brands; a one-to-one mail whose
  // preview invokes a brand it wasn't sent by is a weaker but real tell.
  if (!features.isBulk) {
    for (const { brand, domains } of BRAND_ALIASES) {
      if (domainMatchesAny(features.fromDomain, domains)) continue;
      if (mentionsBrand(features.snippetLower, brand)) {
        signals.push({
          ruleId: "identity.brand_in_preview_domain_mismatch",
          category: "phishing",
          weight: 0.25,
          detail: `L'aperçu évoque "${brand}" mais l'expéditeur est "${features.fromDomain}"`,
        });
        break;
      }
    }
  }

  if (features.punycodeDomain) {
    signals.push({
      ruleId: "identity.punycode_domain",
      category: "phishing",
      weight: 0.2,
      detail: `Domaine encodé en punycode ("${features.fromDomain}")`,
    });
  }

  return signals;
}
