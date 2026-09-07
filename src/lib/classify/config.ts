/**
 * Default classifier configuration. Hardcoded for V1 — a settings UI to edit these
 * without a redeploy is out of scope until the rule set has actually been used
 * against real mail and proven to need tuning per-account.
 */
export const THRESHOLDS = {
  phishing: 0.55,
  spam: 0.5,
  newsletter: 0.4,
};

/**
 * Domains worth protecting against lookalike/typosquat impersonation. Starter list
 * of common French targets — extend via SenderPolicy in a future iteration once
 * the user's actual sensitive services are known.
 */
export const PROTECTED_DOMAINS = [
  "paypal.com",
  "amazon.fr",
  "amazon.com",
  "impots.gouv.fr",
  "ameli.fr",
  "laposte.fr",
  "chronopost.fr",
  "edf.fr",
  "caf.fr",
  "microsoft.com",
  "google.com",
  "apple.com",
  "netflix.com",
];

/**
 * Brand/product names worth checking against the sender's actual domain,
 * separate from PROTECTED_DOMAINS: a phishing subject doesn't have to imitate
 * a lookalike domain at all — it can invoke a brand name from a domain with
 * zero textual resemblance ("PrimeVideo" from approve-it.net, say). Each entry
 * lists every legitimate domain (or domain family) that mention is allowed to
 * come from; a subject/display-name mention from anywhere else is the signal.
 */
export const BRAND_ALIASES: { brand: string; domains: string[] }[] = [
  { brand: "amazon", domains: ["amazon.com", "amazon.fr"] },
  { brand: "prime video", domains: ["amazon.com", "amazon.fr", "primevideo.com"] },
  { brand: "paypal", domains: ["paypal.com"] },
  { brand: "impots", domains: ["impots.gouv.fr"] },
  { brand: "ameli", domains: ["ameli.fr"] },
  { brand: "laposte", domains: ["laposte.fr"] },
  { brand: "la poste", domains: ["laposte.fr"] },
  { brand: "chronopost", domains: ["chronopost.fr"] },
  { brand: "edf", domains: ["edf.fr"] },
  { brand: "caf", domains: ["caf.fr"] },
  { brand: "microsoft", domains: ["microsoft.com"] },
  { brand: "google", domains: ["google.com"] },
  { brand: "apple", domains: ["apple.com"] },
  { brand: "netflix", domains: ["netflix.com"] },
];

export const PHISHING_SUBJECT_KEYWORDS = [
  // French
  "vérifiez votre compte",
  "suspendu",
  "suspension",
  "confirmez votre identité",
  "mise à jour de sécurité",
  "connexion suspecte",
  "colis en attente",
  "paiement refusé",
  "facture impayée",
  "dernier rappel",
  "action requise",
  "urgent",
  // English
  "verify your account",
  "account suspended",
  "confirm your identity",
  "security alert",
  "unusual sign-in",
  "payment failed",
  "final notice",
  "action required",
];

export const SPAM_SUBJECT_KEYWORDS = [
  "gratuit",
  "offre exceptionnelle",
  "promo",
  "réduction",
  "gagnez",
  "félicitations",
  "free",
  "winner",
  "% off",
  "limited time",
  "act now",
  "buy now",
];

export const RISKY_ATTACHMENT_EXTENSIONS = ["exe", "scr", "bat", "cmd", "js", "vbs", "jar", "msi", "ps1"];
