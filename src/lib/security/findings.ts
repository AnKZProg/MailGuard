import { db } from "@/lib/db";
import type { FindingKind, FindingSeverity } from "@prisma/client";

export type RawFinding = {
  kind: FindingKind;
  severity: FindingSeverity;
  externalTarget?: string | null;
  rawConfig: unknown;
};

/**
 * Reconciles a fresh scan against stored findings for the given kinds: known,
 * still-present findings get lastSeenAt bumped; new ones are created; anything
 * previously active for a scanned kind that didn't show up this time is treated as
 * resolved (the forwarding rule was removed, etc.) — auto-resolved, not deleted, so
 * the history stays visible.
 */
export async function reconcileFindings(accountId: string, scannedKinds: FindingKind[], fresh: RawFinding[]): Promise<void> {
  const now = new Date();
  const existingActive = await db.securityFinding.findMany({
    where: { accountId, kind: { in: scannedKinds }, resolvedAt: null },
  });

  const freshKey = (f: { kind: FindingKind; externalTarget?: string | null }) => `${f.kind}::${f.externalTarget ?? ""}`;
  const freshKeys = new Set(fresh.map(freshKey));
  const existingByKey = new Map(existingActive.map((f) => [freshKey(f), f]));

  const toResolve = existingActive.filter((f) => !freshKeys.has(freshKey(f)));
  if (toResolve.length > 0) {
    await db.securityFinding.updateMany({
      where: { id: { in: toResolve.map((f) => f.id) } },
      data: { resolvedAt: now },
    });
  }

  for (const finding of fresh) {
    const key = freshKey(finding);
    const existing = existingByKey.get(key);
    if (existing) {
      await db.securityFinding.update({ where: { id: existing.id }, data: { lastSeenAt: now } });
    } else {
      await db.securityFinding.create({
        data: {
          accountId,
          kind: finding.kind,
          severity: finding.severity,
          externalTarget: finding.externalTarget ?? null,
          rawConfig: JSON.stringify(finding.rawConfig),
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });
    }
  }
}
