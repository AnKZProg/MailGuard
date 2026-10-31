"use server";

import { revalidatePath } from "next/cache";
import { backupNow } from "@/lib/backup/run-backup";

export async function backupNowAction(): Promise<{ ok: boolean }> {
  try {
    await backupNow({ force: true });
    revalidatePath("/accounts");
    return { ok: true };
  } catch (err) {
    console.error("[backup] sauvegarde manuelle échouée", err);
    return { ok: false };
  }
}
