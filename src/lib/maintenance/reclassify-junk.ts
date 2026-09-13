import { db } from "@/lib/db";
import { classifyAndPersist, loadClassifyContext } from "@/lib/classify/classify-and-persist";

export type ReclassifySummary = { reclassified: number; nowFlagged: number };

/**
 * Re-runs the classifier over every provider-flagged message that's still
 * sitting untouched (state "INBOX") — this is what catches mail the user
 * marks as spam directly in Gmail/Outlook themselves: the regular sync path
 * only classifies newly-seen messages, so a message MailGuard already
 * classified as legitimate before the user manually flagged it would
 * otherwise never get a second look. Runs on every sync (see run-sync.ts),
 * so it's scoped to "INBOX" specifically — a message that's already been
 * quarantined/trashed/organized has nothing left to act on, and reclassifying
 * it again is pure repeated work for the same verdict. On a real account this
 * cuts the set from every message ever flagged (which only grows) to just the
 * still-live ones (measured: 0 of 936 across all accounts once the backlog is
 * cleared) — the earlier unscoped version's SQLite writes for hundreds of
 * already-settled messages, every 5 minutes, were enough to stall unrelated
 * page loads for several seconds via write-lock contention.
 */
export async function reclassifyProviderFlaggedMessages(accountId?: string): Promise<ReclassifySummary> {
  const targets = await db.message.findMany({
    where: { providerSpamFlag: true, accountId, state: "INBOX" },
    select: { id: true, verdict: true },
  });

  const classifyContext = targets.length > 0 ? await loadClassifyContext() : null;

  let nowFlagged = 0;
  for (const target of targets) {
    try {
      const { verdict } = await classifyAndPersist(target.id, classifyContext ?? undefined);
      if (verdict === "SPAM" || verdict === "PHISHING") nowFlagged++;
    } catch (err) {
      // Same isolation gap already fixed in the other bulk-per-message loops
      // (organize-by-sender.ts, run-sync.ts): one message failing here must
      // not abort reclassification for every message still queued after it.
      console.error(`[reclassify-junk] échec pour le message ${target.id}`, err);
    }
  }

  return { reclassified: targets.length, nowFlagged };
}
