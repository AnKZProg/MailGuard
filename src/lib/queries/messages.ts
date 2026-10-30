import { db } from "@/lib/db";
import type { Verdict, MessageState } from "@prisma/client";

export type MessageListFilters = {
  accountId?: string;
  verdict?: Verdict;
  state?: MessageState;
  /** Substring match on sender, subject and snippet (SQLite LIKE — case-insensitive for ASCII). */
  search?: string;
  /** Ids the provider's own full-text search returned — widens `search` to message bodies. */
  contentMatches?: { accountId: string; providerMessageIds: string[] }[];
  cursor?: string;
};

const PAGE_SIZE = 50;
/** A search also finds mail already filed into brand folders, not just what's left in the Inbox. */
const SEARCHABLE_STATES: MessageState[] = ["INBOX", "ORGANIZED", "KEPT"];

export async function listMessages(filters: MessageListFilters) {
  const contentClauses = (filters.contentMatches ?? [])
    .filter((m) => m.providerMessageIds.length > 0)
    .map((m) => ({ accountId: m.accountId, providerMessageId: { in: m.providerMessageIds } }));

  const messages = await db.message.findMany({
    where: {
      accountId: filters.accountId,
      verdict: filters.verdict,
      state: filters.state ?? (filters.search ? { in: SEARCHABLE_STATES } : "INBOX"),
      ...(filters.search
        ? {
            OR: [
              { fromAddress: { contains: filters.search } },
              { fromDisplayName: { contains: filters.search } },
              { subject: { contains: filters.search } },
              { snippet: { contains: filters.search } },
              ...contentClauses,
            ],
          }
        : {}),
    },
    include: { account: { select: { emailAddress: true, provider: true, colorToken: true } } },
    orderBy: { receivedAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;

  return { messages: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

export async function countByVerdict(accountId?: string) {
  const rows = await db.message.groupBy({
    by: ["verdict"],
    where: { accountId, state: "INBOX" },
    _count: true,
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.verdict ?? "UNCLASSIFIED"] = row._count;
  return counts;
}
