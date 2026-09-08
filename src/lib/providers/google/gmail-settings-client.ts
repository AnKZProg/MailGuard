const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

async function settingsFetch<T>(accessToken: string, path: string): Promise<T | null> {
  const response = await fetch(`${GMAIL_BASE}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  // 403 here typically means the granted scope doesn't cover this specific settings
  // endpoint (e.g. forwardingAddresses needs gmail.settings.sharing, which we don't
  // request) — degrade gracefully rather than failing the whole audit.
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`Requête settings Gmail échouée: ${path} (${response.status})`);
  // A 2xx response with an empty or non-JSON body has been observed for some
  // accounts on this endpoint — treat it the same as "no finding" instead of
  // throwing SyntaxError and failing the whole audit on every sync.
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[gmail-settings] réponse non-JSON pour ${path}`, err);
    return null;
  }
}

export type AutoForwarding = { enabled: boolean; emailAddress?: string; disposition?: string };
export type GmailFilter = {
  id: string;
  criteria?: Record<string, unknown>;
  action?: { forward?: string; addLabelIds?: string[]; removeLabelIds?: string[] };
};
export type ImapSettings = { enabled: boolean };
export type PopSettings = { accessWindow: string };
export type VacationSettings = { enableAutoReply: boolean; responseSubject?: string };

export const getAutoForwarding = (token: string) => settingsFetch<AutoForwarding>(token, "/settings/autoForwarding");
export const listFilters = (token: string) =>
  settingsFetch<{ filter?: GmailFilter[] }>(token, "/settings/filters").then((r) => r?.filter ?? []);
export const getImapSettings = (token: string) => settingsFetch<ImapSettings>(token, "/settings/imap");
export const getPopSettings = (token: string) => settingsFetch<PopSettings>(token, "/settings/pop");
export const getVacationSettings = (token: string) => settingsFetch<VacationSettings>(token, "/settings/vacation");

/**
 * Creates a server-side Gmail filter that labels future mail matching `matchValue`
 * (an exact address, or `@domain.com` for a whole-domain block) as Spam and pulls
 * it out of the inbox — the same effect as clicking "Report spam" in Gmail's own
 * UI, so it stays reversible and visible in the native Spam folder rather than
 * silently vanishing. No-ops if an equivalent filter already exists, to avoid
 * piling up duplicates on repeated blocks.
 */
export async function ensureSenderBlockFilter(accessToken: string, matchValue: string): Promise<void> {
  const existing = await listFilters(accessToken);
  const alreadyBlocked = existing.some((f) => {
    const from = f.criteria?.from;
    return typeof from === "string" && from.toLowerCase() === matchValue.toLowerCase();
  });
  if (alreadyBlocked) return;

  const response = await fetch(`${GMAIL_BASE}/settings/filters`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      criteria: { from: matchValue },
      action: { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX", "UNREAD"] },
    }),
  });
  if (!response.ok) {
    throw new Error(`Création du filtre Gmail échouée pour ${matchValue} (${response.status})`);
  }
}
