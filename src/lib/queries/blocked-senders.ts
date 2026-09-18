import { db } from "@/lib/db";
import type { PolicyScope, SenderPolicy } from "@prisma/client";

const PAGE_SIZE = 50;

// Dates don't survive the Server Component / Server Action -> Client
// Component boundary as Date instances (Next.js's RSC serialization turns
// them into ISO strings) — this is the shape a client component actually
// receives, so it's the type both page.tsx and the "load more" action return.
export type BlockedSenderPolicy = {
  id: string;
  scope: PolicyScope;
  pattern: string;
  createdAt: string;
  account: { emailAddress: string } | null;
};

export function toClientPolicies(
  policies: (SenderPolicy & { account: { emailAddress: string } | null })[],
): BlockedSenderPolicy[] {
  return policies.map((p) => ({
    id: p.id,
    scope: p.scope,
    pattern: p.pattern,
    createdAt: p.createdAt.toISOString(),
    account: p.account,
  }));
}

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
