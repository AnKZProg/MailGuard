import { db } from "@/lib/db";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_DAYS = 7;

export type ShellStats = {
  unread: number;
  quarantined: number;
  blocked: number;
  criticalFindings: number;
  accountsNeedingAttention: number;
  shadowMode: boolean;
  lastSyncAt: Date | null;
  /** Mail quarantined per local calendar day, oldest first, today last. */
  interceptedPerDay: number[];
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function bucketPerDay(dates: Date[], now: Date, days: number): number[] {
  const today = startOfLocalDay(now).getTime();
  const buckets = new Array<number>(days).fill(0);
  for (const date of dates) {
    const daysAgo = Math.round((today - startOfLocalDay(date).getTime()) / DAY_MS);
    if (daysAgo >= 0 && daysAgo < days) buckets[days - 1 - daysAgo] += 1;
  }
  return buckets;
}

/** Everything the sidebar shows, in one round of cheap, indexed counts. */
export async function loadShellStats(now: Date = new Date()): Promise<ShellStats> {
  const weekStart = new Date(startOfLocalDay(now).getTime() - (WEEK_DAYS - 1) * DAY_MS);
  const [unread, quarantined, blocked, criticalFindings, accountsNeedingAttention, shadowMode, lastSync, recent] =
    await Promise.all([
      db.message.count({ where: { state: "INBOX", isRead: false } }),
      db.quarantineItem.count({ where: { restoredAt: null, purgedAt: null } }),
      db.senderPolicy.count({ where: { verdict: "BLOCK" } }),
      db.securityFinding.count({ where: { resolvedAt: null, severity: "CRITICAL", acknowledgedAt: null } }),
      db.account.count({ where: { status: { not: "ACTIVE" } } }),
      isShadowModeEnabled(),
      db.account.aggregate({ _max: { lastSyncAt: true } }),
      db.quarantineItem.findMany({ where: { quarantinedAt: { gte: weekStart } }, select: { quarantinedAt: true } }),
    ]);

  return {
    unread,
    quarantined,
    blocked,
    criticalFindings,
    accountsNeedingAttention,
    shadowMode,
    lastSyncAt: lastSync._max.lastSyncAt,
    interceptedPerDay: bucketPerDay(
      recent.map((r) => r.quarantinedAt),
      now,
      WEEK_DAYS,
    ),
  };
}
