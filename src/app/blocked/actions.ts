"use server";

import { revalidatePath } from "next/cache";
import { unblockSender } from "@/lib/policy/block-sender";
import { listBlockedSenders, toClientPolicies, type BlockedSenderPolicy } from "@/lib/queries/blocked-senders";

export async function unblockSenderAction(policyId: string): Promise<void> {
  await unblockSender(policyId);
  revalidatePath("/blocked");
}

export async function loadMoreBlockedSenders(
  cursor: string,
  query?: string,
): Promise<{ policies: BlockedSenderPolicy[]; nextCursor: string | null }> {
  const { policies, nextCursor } = await listBlockedSenders(cursor, query);
  return { policies: toClientPolicies(policies), nextCursor };
}
