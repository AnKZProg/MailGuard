"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { setAllowlistOnly, setShadowMode } from "@/lib/settings/app-settings";
import { assertId } from "@/lib/http/action-input";

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
  // The sidebar's status pill and toggle live in the root layout — refresh every page, not just /accounts.
  revalidatePath("/", "layout");
}

export async function toggleAllowlistOnly(formData: FormData): Promise<void> {
  const accountId = formData.get("accountId");
  assertId(accountId, "Identifiant de compte");
  const enabled = formData.get("enabled") === "true";
  // Only for a box MailGuard actually knows — never leave a setting row for a stray id.
  const account = await db.account.findUnique({ where: { id: accountId }, select: { id: true } });
  if (!account) return;

  await setAllowlistOnly(accountId, enabled);
  await db.auditLog.create({
    data: {
      actor: "USER",
      action: enabled ? "allowlist_only_on" : "allowlist_only_off",
      accountId,
      messageIds: "[]",
    },
  });
  revalidatePath("/accounts");
}
