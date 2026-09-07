"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { purgeAllActiveItems, type PurgeSummary } from "@/lib/quarantine/purge";
import { blockSenderPermanently } from "@/lib/policy/block-sender";

export async function purgeAllNow(): Promise<PurgeSummary> {
  const summary = await purgeAllActiveItems();
  revalidatePath("/quarantine");
  revalidatePath("/");
  return summary;
}

export type BlockAllSummary = { blocked: number };

/**
 * Blocks every sender currently sitting in quarantine (address-level) in one
 * pass: local SenderPolicy for each + a best-effort provider-side Gmail
 * filter/Outlook rule. Dedupes by [accountId, fromAddress] so a sender with
 * several quarantined messages is only blocked once.
 */
export async function blockAllQuarantinedSenders(): Promise<BlockAllSummary> {
  const items = await db.quarantineItem.findMany({
    where: { purgedAt: null, restoredAt: null },
    include: { message: { select: { accountId: true, fromAddress: true } } },
  });

  const uniqueSenders = new Map<string, { accountId: string; fromAddress: string }>();
  for (const item of items) {
    const key = `${item.message.accountId}::${item.message.fromAddress}`;
    uniqueSenders.set(key, { accountId: item.message.accountId, fromAddress: item.message.fromAddress });
  }

  let blocked = 0;
  for (const { accountId, fromAddress } of uniqueSenders.values()) {
    await blockSenderPermanently(accountId, "ADDRESS", fromAddress);
    blocked++;
  }

  revalidatePath("/quarantine");
  revalidatePath("/");
  return { blocked };
}
