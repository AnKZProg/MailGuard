import { BANK_DETAILS_CHANGE_KEYWORDS } from "@/lib/classify/config";

/**
 * An auto-reply answers everyone who writes in, with the account's own trusted
 * name on it — so an attacker who briefly controls the mailbox can turn it into
 * a phishing sender ("our bank details changed", "log in here"). Flags the
 * replies that carry what such a message needs: a link, another mailbox to
 * write to, or payment instructions.
 */
export type AutoReplyAssessment = { reasons: string[]; target: string | null };

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PAYMENT_KEYWORDS = [...BANK_DETAILS_CHANGE_KEYWORDS, "iban", "virement", "wire transfer", "carte cadeau", "gift card", "bitcoin"];

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url.startsWith("www.") ? `https://${url}` : url).hostname;
  } catch {
    return url;
  }
}

export function assessAutoReply(text: string, ownAddresses: string[]): AutoReplyAssessment | null {
  const lower = text.toLowerCase();
  const own = new Set(ownAddresses.map((a) => a.toLowerCase()));
  const reasons: string[] = [];
  let target: string | null = null;

  const url = text.match(URL_PATTERN)?.[0];
  if (url) {
    reasons.push("contient un lien");
    target = hostOf(url);
  }

  const otherMailbox = [...text.matchAll(EMAIL_PATTERN)].map((m) => m[0].toLowerCase()).find((a) => !own.has(a));
  if (otherMailbox) {
    reasons.push(`renvoie vers ${otherMailbox}`);
    target ??= otherMailbox;
  }

  const payment = PAYMENT_KEYWORDS.find((k) => lower.includes(k));
  if (payment) {
    reasons.push(`parle de « ${payment} »`);
    target ??= payment;
  }

  return reasons.length > 0 ? { reasons, target } : null;
}
