"use server";

import { revalidatePath } from "next/cache";
import { unblockSender } from "@/lib/policy/block-sender";

export async function unblockSenderAction(policyId: string): Promise<void> {
  await unblockSender(policyId);
  revalidatePath("/blocked");
}
