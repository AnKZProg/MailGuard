import { db } from "@/lib/db";
import type { Verdict, MessageState } from "@prisma/client";

export type MessageListFilters = {
  accountId?: string;
  verdict?: Verdict;
  state?: MessageState;
  cursor?: string;
};

const PAGE_SIZE = 50;

export async function listMessages(filters: MessageListFilters) {
  const messages = await db.message.findMany({
    where: {
      accountId: filters.accountId,
      verdict: filters.verdict,
      state: filters.state ?? "INBOX",
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
