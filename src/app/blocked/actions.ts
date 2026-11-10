"use server";

import { revalidatePath } from "next/cache";
import { unblockSender } from "@/lib/policy/block-sender";
import { listBlockedSenders, toClientPolicies, type BlockedSenderPolicy } from "@/lib/queries/blocked-senders";
import { assertId, optionalQuery } from "@/lib/http/action-input";

export async function unblockSenderAction(policyId: string): Promise<{ providerRuleRemoved: boolean }> {
  assertId(policyId);
  const result = await unblockSender(policyId);
  revalidatePath("/blocked");
  return result;
}

export async function loadMoreBlockedSenders(
  cursor: string,
  query?: string,
): Promise<{ policies: BlockedSenderPolicy[]; nextCursor: string | null }> {
  assertId(cursor);
  const { policies, nextCursor } = await listBlockedSenders(cursor, optionalQuery(query));
  return { policies: toClientPolicies(policies), nextCursor };
}
