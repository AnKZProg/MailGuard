import { db } from "@/lib/db";

const SHADOW_MODE_KEY = "shadowMode";
const QUARANTINE_DAYS_KEY = "quarantineDays";
const DEFAULT_QUARANTINE_DAYS = 14;

/**
 * Shadow mode defaults to ON: the classifier scores and labels messages but never
 * moves anything server-side until the user explicitly turns it off, having seen
 * enough verdicts to trust them. This is the main safety net against a false
 * positive quarantining someone's actual bank statement on day one.
 */
export async function isShadowModeEnabled(): Promise<boolean> {
  const setting = await db.appSetting.findUnique({ where: { key: SHADOW_MODE_KEY } });
  if (!setting) return true;
  return setting.value === "true";
}

export async function setShadowMode(enabled: boolean): Promise<void> {
  await db.appSetting.upsert({
    where: { key: SHADOW_MODE_KEY },
    create: { key: SHADOW_MODE_KEY, value: String(enabled) },
    update: { value: String(enabled) },
  });
}

const ALLOWLIST_ONLY_PREFIX = "allowlistOnly:";

/** Boxes in "allowlist only" mode, mapped to the moment the mode was turned on
 * (see lib/classify/allowlist-only.ts). Stored as one AppSetting row per box —
 * no schema change needed. */
export async function getAllowlistOnlyAccounts(): Promise<Map<string, Date>> {
  const rows = await db.appSetting.findMany({ where: { key: { startsWith: ALLOWLIST_ONLY_PREFIX } } });
  const entries = rows
    .map((row) => [row.key.slice(ALLOWLIST_ONLY_PREFIX.length), new Date(row.value)] as const)
    .filter(([accountId, since]) => accountId.length > 0 && !Number.isNaN(since.getTime()));
  return new Map(entries);
}

export async function setAllowlistOnly(accountId: string, enabled: boolean): Promise<void> {
  const key = `${ALLOWLIST_ONLY_PREFIX}${accountId}`;
  if (!enabled) {
    await db.appSetting.deleteMany({ where: { key } });
    return;
  }
  // Keep the original activation date if it's already on (a double-submit must
  // not move the cut-off forward and skip mail received in between).
  await db.appSetting.upsert({
    where: { key },
    create: { key, value: new Date().toISOString() },
    update: {},
  });
}

export async function getQuarantineDays(): Promise<number> {
  const setting = await db.appSetting.findUnique({ where: { key: QUARANTINE_DAYS_KEY } });
  if (!setting) return DEFAULT_QUARANTINE_DAYS;
  const parsed = Number(setting.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUARANTINE_DAYS;
}

export async function setQuarantineDays(days: number): Promise<void> {
  await db.appSetting.upsert({
    where: { key: QUARANTINE_DAYS_KEY },
    create: { key: QUARANTINE_DAYS_KEY, value: String(days) },
    update: { value: String(days) },
  });
}
