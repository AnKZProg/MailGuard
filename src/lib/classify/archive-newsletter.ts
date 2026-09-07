import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { withBackoff } from "@/lib/sync/backoff";
import { modifyLabels } from "@/lib/providers/google/gmail-client";
import { moveMessage, getWellKnownFolderId } from "@/lib/providers/microsoft/graph-client";

/**
 * Moves a newsletter out of the visible Inbox (Gmail: drop the INBOX label,
 * still reachable under All Mail; Outlook: move to the native Archive folder)
 * without touching the message's local `state` — it must stay "INBOX" in the
 * DB so it keeps showing up in the web app's Newsletter tab for review,
 * unsubscribe, or bulk delete.
 */
export async function archiveNewsletterMessage(messageId: string): Promise<void> {
  const message = await db.message.findUniqueOrThrow({ where: { id: messageId }, include: { account: true } });
  const accessToken = await getValidAccessToken(message.accountId);

  if (message.account.provider === "GOOGLE") {
    await withBackoff(() => modifyLabels(accessToken, message.providerMessageId, [], ["INBOX"]));
  } else {
    const archiveId = await withBackoff(() => getWellKnownFolderId(accessToken, "archive"));
    await withBackoff(() => moveMessage(accessToken, message.providerMessageId, archiveId));
  }
}
