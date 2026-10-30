import { db } from "@/lib/db";
import type { Verdict } from "@prisma/client";
import { recordUserVerdict } from "@/lib/classify/learner/store";
import { quarantineMessage } from "@/lib/quarantine/quarantine";
import { restoreMessage } from "@/lib/quarantine/restore";
import { archiveNewsletterMessage, unarchiveMessage } from "@/lib/classify/archive-newsletter";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";

const isJunk = (v: Verdict | null) => v === "SPAM" || v === "PHISHING";

/**
 * The user says "this message is actually X": train the learner, store the verdict,
 * then move the message where that verdict belongs (unless shadow mode forbids moves).
 */
export async function correctVerdict(messageId: string, verdict: Verdict): Promise<void> {
  const before = await db.message.findUniqueOrThrow({ where: { id: messageId } });
  await recordUserVerdict(messageId, verdict);
  await db.message.update({ where: { id: messageId }, data: { verdict, score: 1 } });
  await db.auditLog.create({
    data: {
      actor: "USER",
      action: "correct_verdict",
      accountId: before.accountId,
      messageIds: JSON.stringify([messageId]),
      before: before.verdict,
      after: verdict,
    },
  });

  if (await isShadowModeEnabled()) return;

  if (isJunk(verdict)) {
    if (before.state === "INBOX") await quarantineMessage(messageId, verdict === "PHISHING" ? "phishing" : "spam");
    return;
  }
  if (before.state === "QUARANTINED") {
    await restoreMessage(messageId);
    if (verdict === "NEWSLETTER") await archiveNewsletterMessage(messageId);
    return;
  }
  if (before.state !== "INBOX") return;
  if (verdict === "NEWSLETTER" && before.verdict !== "NEWSLETTER") await archiveNewsletterMessage(messageId);
  if (verdict === "LEGITIMATE" && before.verdict === "NEWSLETTER") await unarchiveMessage(messageId);
}

/** Implicit feedback from other actions must never make the action itself fail. */
export async function learnQuietly(messageId: string, verdict: Verdict): Promise<void> {
  await recordUserVerdict(messageId, verdict).catch((err) => console.error(`[learner] apprentissage ignoré pour ${messageId}`, err));
}
