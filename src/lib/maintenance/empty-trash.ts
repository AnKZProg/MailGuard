import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import {
  listTrashMessageIds,
  permanentlyDeleteMessage as gmailPermanentDelete,
  InsufficientScopeError,
} from "@/lib/providers/google/gmail-client";
import {
  listDeletedItemsMessageIds,
  permanentlyDeleteMessage as graphPermanentDelete,
} from "@/lib/providers/microsoft/graph-client";

export type EmptyTrashSummary = { deleted: number; failed: number; insufficientScope: boolean };

/**
 * Permanently empties the provider's own Trash/Deleted Items folder for one
 * account. This is a genuine, irreversible hard delete — deliberately scoped to
 * mail the user (or the provider's own spam filter) already sent to trash, never
 * to anything still in the inbox or in MailGuard's own quarantine.
 *
 * Gmail requires the `mail.google.com` scope for a true hard delete, which this
 * app does not request (gmail.modify only covers trash/label moves) — reported
 * back via `insufficientScope` rather than thrown, so a sync loop over many
 * accounts doesn't abort on the first Gmail account it hits.
 */
export async function emptyTrash(accountId: string, provider: "GOOGLE" | "MICROSOFT"): Promise<EmptyTrashSummary> {
  const accessToken = await getValidAccessToken(accountId);
  const ids = provider === "GOOGLE" ? await listTrashMessageIds(accessToken) : await listDeletedItemsMessageIds(accessToken);

  let deleted = 0;
  let failed = 0;
  let insufficientScope = false;

  for (const id of ids) {
    try {
      if (provider === "GOOGLE") {
        await gmailPermanentDelete(accessToken, id);
      } else {
        await graphPermanentDelete(accessToken, id);
      }
      deleted++;
    } catch (err) {
      if (err instanceof InsufficientScopeError) {
        insufficientScope = true;
        break; // every subsequent call will fail the same way — stop wasting requests
      }
      console.error(`[empty-trash] échec pour ${id}`, err);
      failed++;
    }
  }

  if (deleted > 0 || failed > 0) {
    await db.auditLog.create({
      data: {
        actor: "ENGINE",
        action: "empty_trash",
        accountId,
        messageIds: JSON.stringify([]),
        after: JSON.stringify({ deleted, failed, insufficientScope }),
      },
    });
  }

  return { deleted, failed, insufficientScope };
}
