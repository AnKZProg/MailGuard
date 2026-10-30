import type { Message, Verdict } from "@prisma/client";
import { compactMailDate, longMailDate, mailDateGroup, type DateGroup } from "@/lib/format/mail-date";
import { inboxHref, type InboxQuery } from "@/lib/queries/inbox-url";

export type InboxRow = {
  id: string;
  href: string;
  senderName: string | null;
  senderAddress: string;
  subject: string;
  snippet: string | null;
  verdict: Verdict | null;
  isRead: boolean;
  dateLabel: string;
  dateTitle: string;
  group: DateGroup;
  accountEmail: string;
  accountColorVar: string;
};

type ListedMessage = Message & { account: { emailAddress: string; colorToken: string } };

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
// Marketing mails pad their preview with invisible characters so the client shows no snippet;
// rendered, they make the list's ellipsis float alone at the end of an apparently short line.
const INVISIBLE_PADDING = /[\u034F\u00AD\u200B-\u200F\u2060\uFEFF]/g;

/** Gmail returns snippets HTML-escaped ("d&#39;accès"); React would print the entities literally. */
export function cleanSnippet(snippet: string | null): string | null {
  if (!snippet) return null;
  const decoded = snippet
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? entity);
  const cleaned = decoded.replace(INVISIBLE_PADDING, "").replace(/\s+/g, " ").trim();
  return cleaned || null;
}

/**
 * Dates are formatted here, on the server, so the client list renders the exact
 * same strings it hydrates with (no server/browser time-zone mismatch).
 */
export function toInboxRows(messages: ListedMessage[], query: InboxQuery, now: Date = new Date()): InboxRow[] {
  return messages.map((m) => ({
    id: m.id,
    href: inboxHref({ ...query, open: m.id }),
    senderName: m.fromDisplayName,
    senderAddress: m.fromAddress,
    subject: m.subject,
    snippet: cleanSnippet(m.snippet),
    verdict: m.verdict,
    isRead: m.isRead,
    dateLabel: compactMailDate(m.receivedAt, now),
    dateTitle: longMailDate(m.receivedAt),
    group: mailDateGroup(m.receivedAt, now),
    accountEmail: m.account.emailAddress,
    accountColorVar: `var(--${m.account.colorToken.replace("account-", "account-color-")})`,
  }));
}
