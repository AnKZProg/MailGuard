import type { MessageFeatures } from "@/lib/classify/features";
import type { ClassificationResult } from "@/lib/classify/score";
import type { Signal } from "@/lib/classify/signal";

export const SECURITY_ALERT_RULE_ID = "security.platform_alert";

/** Platforms whose account-security mail must always reach the inbox, never quarantine. */
export const SECURITY_PLATFORMS: { name: string; domains: string[] }[] = [
  { name: "Steam", domains: ["steampowered.com", "steamcommunity.com"] },
  { name: "Discord", domains: ["discord.com", "discordapp.com"] },
];

/**
 * Subject words of a login / credential event (FR + EN). Steam and Discord send these
 * for a new device, a Steam Guard or login code, a password or e-mail change, recovery.
 * Matched on the lowercase subject with accents stripped.
 */
const SECURITY_SUBJECT_PATTERNS: RegExp[] = [
  /steam guard/,
  /nouvel (appareil|ordinateur|emplacement)|new (device|computer|location)/,
  /nouvelle connexion|new (login|sign.?in)|verify(ing)? (your )?login|verifier (la|ta|votre) connexion/,
  /code (de connexion|d.acces|de verification)|login code|verification code/,
  /mot de passe|password/,
  /adresse (e-?mail|electronique)|e-?mail address|e-?mail (change|modifi)/,
  /recuperation|recovery|deauthori[sz]|desautoris/,
  /authentification|authenticator|two.?factor|2fa|a2f/,
];

function platformFor(domain: string): string | null {
  const hit = SECURITY_PLATFORMS.find(({ domains }) => domains.some((d) => domain === d || domain.endsWith(`.${d}`)));
  return hit ? hit.name : null;
}

/**
 * An authenticated security notice from Steam or Discord, or null. The sender domain
 * alone proves nothing (it can be spoofed), so DKIM or DMARC must have explicitly
 * passed, and neither may have failed.
 */
export function detectSecurityAlert(features: MessageFeatures): string | null {
  const platform = platformFor(features.fromDomain);
  if (!platform) return null;
  if (features.authDmarcFail || features.authDkimFail) return null;
  if (!features.authDmarcPass && !features.authDkimPass) return null;
  if (features.isBulk) return null; // wishlist sales and newsletters carry List-Unsubscribe; security mail doesn't
  const subject = features.subjectLower.normalize("NFD").replace(/\p{M}/gu, ""); // "récupération" → "recuperation"
  return SECURITY_SUBJECT_PATTERNS.some((p) => p.test(subject)) ? platform : null;
}

/** Forces the verdict to LEGITIMATE and tags it, so the inbox can flag it as a security alert. */
export function keepSecurityAlert(result: ClassificationResult, platform: string): ClassificationResult {
  const signal: Signal = {
    ruleId: SECURITY_ALERT_RULE_ID,
    category: "security",
    weight: 0,
    detail: `Alerte de sécurité ${platform} authentique (signature vérifiée) : gardée en boîte de réception. Si ce n'était pas toi, change ton mot de passe ${platform} depuis l'appli, sans passer par un lien.`,
  };
  return { ...result, verdict: "LEGITIMATE", shouldQuarantine: false, signals: [...result.signals, signal] };
}
