import type { Verdict } from "@prisma/client";

export type InboxQuery = { verdict?: Verdict; account?: string; q?: string };

const VERDICTS = new Set<string>(["LEGITIMATE", "NEWSLETTER", "SPAM", "PHISHING"]);
const MAX_SEARCH_LENGTH = 200;

/** Search params are user-editable: an unknown verdict would otherwise reach Prisma's enum and 500. */
export function parseInboxQuery(raw: { verdict?: string; account?: string; q?: string }): InboxQuery {
  const q = raw.q?.trim().slice(0, MAX_SEARCH_LENGTH);
  return {
    verdict: raw.verdict && VERDICTS.has(raw.verdict) ? (raw.verdict as Verdict) : undefined,
    account: raw.account || undefined,
    q: q || undefined,
  };
}

/** Builds an inbox URL that keeps the current filters — every inbox link goes through this. */
export function inboxHref(query: InboxQuery & { open?: string; cursor?: string }): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const search = params.toString();
  return search ? `/?${search}` : "/";
}
