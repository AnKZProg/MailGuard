// Personal-correspondence domains: grouping by these would bundle unrelated
// people together under a folder named after their email provider, which is
// never what "organize by sender" should do.
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "yahoo.com",
  "yahoo.fr",
  "live.com",
  "live.fr",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "gmx.com",
  "aol.com",
  "free.fr",
  "orange.fr",
  "laposte.net",
  "wanadoo.fr",
  "sfr.fr",
]);

// A handful of well-known senders that mail from more than one registrable
// domain — without this, "battle.net" and "blizzard.com" mail would land in
// two different new folders instead of the user's existing "Blizzard" one.
const BRAND_DOMAIN_ALIASES: Record<string, string> = {
  "battle.net": "Blizzard",
  "blizzard.com": "Blizzard",
  "ubi.com": "Ubisoft",
  "ubisoft.com": "Ubisoft",
  "riotgames.com": "Riot Games",
  "playvalorant.com": "Riot Games",
  "leagueoflegends.com": "Riot Games",
  "epicgames.com": "Epic Games",
  "steampowered.com": "Steam",
  "steamgames.com": "Steam",
  "ea.com": "EA",
  "primevideo.com": "Amazon",
  "amazon.com": "Amazon",
  "amazon.fr": "Amazon",
};

// Compound public-suffix patterns where the registrable domain is the last
// THREE labels, not two (e.g. "shop.example.co.uk" -> "example.co.uk"). Not
// exhaustive — good enough for the common cases without a full PSL dependency.
const COMPOUND_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "co.jp",
  "ne.jp",
  "co.nz",
  "com.au",
  "com.br",
]);

function registrableDomain(domain: string): string {
  const labels = domain.split(".");
  if (labels.length <= 2) return domain;
  const lastTwo = labels.slice(-2).join(".");
  if (COMPOUND_SUFFIXES.has(lastTwo) && labels.length >= 3) return labels.slice(-3).join(".");
  return lastTwo;
}

// `domainOf()` takes everything after the last "@" in a fully
// attacker-controlled `From:` header with no syntax validation. Every actual
// write sink downstream (Gmail label JSON body, Graph folder OData `$filter`
// — the latter already escapes embedded quotes) is safe against injection,
// but nothing stops a malformed value from becoming a garbage folder name.
// Reject anything that isn't a plausible DNS hostname before it goes any
// further, as defense in depth independent of those sinks' own escaping.
const VALID_HOSTNAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

function titleCase(label: string): string {
  return label
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Returns a human-readable brand name for this sender domain, or null when the
 * domain is a generic personal-email provider that shouldn't be grouped at all.
 *
 * Known tradeoff: brand names come from only the second-level label (e.g.
 * "amazon.<any-tld>" -> "Amazon"), not the full registrable domain beyond
 * BRAND_DOMAIN_ALIASES. A sender who registers a domain sharing an SLD with a
 * brand the user already has a folder for (e.g. "amazon.<unusual-tld>") gets
 * filed into that same folder rather than flagged — this affects only
 * *organize by sender*, not spam/phishing classification, which is a
 * separate signal-based pipeline unaffected by this. Fixing it properly would
 * need full registrable-domain matching via a public-suffix-list dependency;
 * not worth the added complexity for what's a filing/cosmetic risk, not a
 * classification one. */
export function brandForDomain(rawDomain: string): string | null {
  // A trailing dot (rare but RFC-valid, e.g. "example.com.") would otherwise
  // make registrableDomain treat the empty label after it as the TLD.
  const domain = rawDomain.trim().toLowerCase().replace(/\.$/, "");
  if (!domain || !VALID_HOSTNAME.test(domain) || PUBLIC_EMAIL_DOMAINS.has(domain)) return null;

  if (BRAND_DOMAIN_ALIASES[domain]) return BRAND_DOMAIN_ALIASES[domain];

  const registrable = registrableDomain(domain);
  if (PUBLIC_EMAIL_DOMAINS.has(registrable)) return null;
  if (BRAND_DOMAIN_ALIASES[registrable]) return BRAND_DOMAIN_ALIASES[registrable];

  const sld = registrable.split(".")[0];
  return sld ? titleCase(sld) : null;
}
