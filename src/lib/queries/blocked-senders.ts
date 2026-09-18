import { db } from "@/lib/db";

const PAGE_SIZE = 50;

export async function listBlockedSenders(cursor?: string) {
  const policies = await db.senderPolicy.findMany({
    where: { verdict: "BLOCK" },
    include: { account: { select: { emailAddress: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = policies.length > PAGE_SIZE;
  const page = hasMore ? policies.slice(0, PAGE_SIZE) : policies;

  return { policies: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}
