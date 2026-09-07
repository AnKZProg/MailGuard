"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { trashMessageById } from "@/lib/mail/trash";
import { quarantineMessage } from "@/lib/quarantine/quarantine";
import { restoreMessage } from "@/lib/quarantine/restore";
import { blockSenderPermanently } from "@/lib/policy/block-sender";

async function writeAuditLog(action: string, accountId: string, messageIds: string[]) {
  await db.auditLog.create({ data: { actor: "USER", action, accountId, messageIds: JSON.stringify(messageIds) } });
}

export async function quarantineNow(messageId: string): Promise<void> {
  await quarantineMessage(messageId, "spam");
  revalidatePath("/");
  revalidatePath("/quarantine");
}

export async function restoreNow(messageId: string): Promise<void> {
  await restoreMessage(messageId);
  revalidatePath("/");
  revalidatePath("/quarantine");
}

export async function trashNow(messageId: string): Promise<void> {
  await trashMessageById(messageId);
  revalidatePath("/");
}

export async function toggleRead(messageId: string, isRead: boolean): Promise<void> {
  await db.message.update({ where: { id: messageId }, data: { isRead } });
  revalidatePath("/");
}

export async function allowSender(messageId: string, scope: "ADDRESS" | "DOMAIN"): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId } });
  const pattern = scope === "ADDRESS" ? message.fromAddress : message.fromDomain;
  const existing = await db.senderPolicy.findFirst({ where: { scope, pattern, accountId: message.accountId } });
  if (!existing) {
    await db.senderPolicy.create({ data: { scope, pattern, verdict: "ALLOW", accountId: message.accountId } });
  } else if (existing.verdict !== "ALLOW") {
    await db.senderPolicy.update({ where: { id: existing.id }, data: { verdict: "ALLOW" } });
  }
  await writeAuditLog("allow_sender", message.accountId, [messageId]);
  revalidatePath("/");
}

/**
 * Blocks the sender locally (SenderPolicy) and, best effort, installs a
 * server-side Gmail filter / Outlook rule so the provider itself intercepts
 * future mail from this pattern — see blockSenderPermanently.
 */
export async function blockSender(messageId: string, scope: "ADDRESS" | "DOMAIN"): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId } });
  const pattern = scope === "ADDRESS" ? message.fromAddress : message.fromDomain;
  await blockSenderPermanently(message.accountId, scope, pattern);
  await writeAuditLog("block_sender", message.accountId, [messageId]);
  revalidatePath("/");
}
