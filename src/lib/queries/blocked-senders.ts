import { db } from "@/lib/db";

const PAGE_SIZE = 50;

export async function listBlockedSenders(cursor?: string, query?: string) {
  // SQLite's `LIKE` (what Prisma's `contains` compiles to here) is already
  // case-insensitive for ASCII, which covers real email addresses/domains —
  // no `mode: "insensitive"` needed (and it isn't supported on this provider).
  const trimmedQuery = query?.trim();
  const policies = await db.senderPolicy.findMany({
    where: { verdict: "BLOCK", ...(trimmedQuery ? { pattern: { contains: trimmedQuery } } : {}) },
    include: { account: { select: { emailAddress: true } } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = policies.length > PAGE_SIZE;
  const page = hasMore ? policies.slice(0, PAGE_SIZE) : policies;

  return { policies: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}
