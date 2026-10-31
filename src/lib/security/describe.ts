import type { FindingKind } from "@prisma/client";

type DescribableFinding = { kind: FindingKind; externalTarget: string | null; rawConfig: string };

function parseConfig(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** One plain-French line saying what was found, shown under the finding's title. */
export function describeFinding({ kind, externalTarget, rawConfig }: DescribableFinding): string | null {
  const config = parseConfig(rawConfig);
  switch (kind) {
    case "AUTO_FORWARD":
    case "INBOX_RULE_FORWARD":
      return externalTarget ? `transfère tes mails vers ${externalTarget}` : null;
    case "ALT_ADDRESS":
      return config.reason === "reply_to"
        ? `les réponses à ${String(config.sendAsEmail ?? "tes mails")} partent vers ${externalTarget}`
        : `peut envoyer des mails en tant que ${externalTarget}`;
    case "VACATION_SUSPICIOUS": {
      const reasons = Array.isArray(config.reasons) ? config.reasons.map(String) : [];
      return reasons.length > 0 ? `la réponse automatique ${reasons.join(", ")}` : "réponse automatique active";
    }
    case "IMAP_POP_ENABLED":
      return "un logiciel de messagerie peut lire la boîte avec le mot de passe seul";
    default:
      return externalTarget;
  }
}
