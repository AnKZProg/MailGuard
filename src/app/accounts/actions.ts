"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { setShadowMode } from "@/lib/settings/app-settings";

export async function disconnectAccount(formData: FormData): Promise<void> {
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  // Best-effort: the account row (and its encrypted tokens) is the source of truth
  // for MailGuard's access. We don't call the provider's revoke endpoint here — the
  // user can also revoke from their Google/Microsoft account security page directly.
  // deleteMany (not delete) so a double-submit's second request — the row
  // already gone — doesn't throw P2025 instead of just being a no-op.
  await db.account.deleteMany({ where: { id: accountId } });
  revalidatePath("/accounts");
}

export async function toggleShadowMode(formData: FormData): Promise<void> {
  await setShadowMode(formData.get("enabled") === "true");
  revalidatePath("/accounts");
}
