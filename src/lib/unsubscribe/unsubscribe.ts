import { db } from "@/lib/db";
import { assertPublicHttpUrl } from "@/lib/unsubscribe/ssrf-guard";

export type UnsubscribeResult = "success" | "unsupported" | "failed";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function extractUris(listUnsubscribe: string): string[] {
  const matches = listUnsubscribe.match(/<([^>]+)>/g) ?? [];
  return matches.map((m) => m.slice(1, -1).trim());
}

/**
 * Executes the unsubscribe mechanism a message's own List-Unsubscribe header
 * declares (RFC 2369 / RFC 8058) — this is a structured, standardized signal
 * senders publish specifically so mail clients can act on it automatically
 * (exactly what Gmail/Outlook's built-in "Unsubscribe" button does), not
 * something MailGuard infers from the message body.
 *
 * Only http(s) targets are supported: a mailto: target would require send
 * permission, which MailGuard's OAuth scopes deliberately don't request.
 */
const USER_AGENT = "Mozilla/5.0 (compatible; MailGuard/1.0; +local-mail-client)";

/**
 * Fetches with redirects handled manually (not `follow`) so every hop — not
 * just the first URL — gets the same private-network check: a public
 * unsubscribe link could otherwise 302 to an internal target the initial
 * check never saw.
 */
async function tryMethod(uri: string, method: "GET" | "POST", oneClick: boolean): Promise<Response> {
  let target = uri;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHttpUrl(target);
    const response = await fetch(target, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      ...(method === "POST" && oneClick ? { body: "List-Unsubscribe=One-Click" } : {}),
    });

    const location = [301, 302, 303, 307, 308].includes(response.status) ? response.headers.get("location") : null;
    if (!location) return response;
    target = new URL(location, target).toString();
  }
  throw new Error("trop de redirections");
}

/**
 * Executes the unsubscribe mechanism a message's own List-Unsubscribe header
 * declares (RFC 2369 / RFC 8058) — this is a structured, standardized signal
 * senders publish specifically so mail clients can act on it automatically
 * (exactly what Gmail/Outlook's built-in "Unsubscribe" button does), not
 * something MailGuard infers from the message body.
 *
 * Only http(s) targets are supported: a mailto: target would require send
 * permission, which MailGuard's OAuth scopes deliberately don't request.
 *
 * Some senders' endpoints reject whichever HTTP method we guess first (a bare
 * "405 Method Not Allowed" regardless of what List-Unsubscribe-Post declared)
 * — on a 405, the other method is tried once before giving up.
 */
export async function attemptUnsubscribe(
  listUnsubscribe: string,
  listUnsubscribePost: string | null,
): Promise<{ result: UnsubscribeResult; detail: string }> {
  const uris = extractUris(listUnsubscribe);
  const httpUri = uris.find((u) => u.startsWith("http://") || u.startsWith("https://"));

  if (!httpUri) {
    return { result: "unsupported", detail: "Seul un désabonnement par e-mail (mailto:) est proposé — non automatisable ici." };
  }

  const oneClick = (listUnsubscribePost ?? "").toLowerCase().includes("one-click");
  const firstMethod: "GET" | "POST" = oneClick ? "POST" : "GET";
  const fallbackMethod: "GET" | "POST" = firstMethod === "GET" ? "POST" : "GET";

  try {
    let response = await tryMethod(httpUri, firstMethod, oneClick);
    if (response.status === 405) {
      response = await tryMethod(httpUri, fallbackMethod, oneClick);
    }

    if (!response.ok) {
      return { result: "failed", detail: `Le serveur du lien de désabonnement a répondu ${response.status}` };
    }
    return { result: "success", detail: httpUri };
  } catch (err) {
    return { result: "failed", detail: err instanceof Error ? err.message : "Erreur réseau" };
  }
}

export type BulkUnsubscribeSummary = { attempted: number; success: number; unsupported: number; failed: number };

/**
 * Runs attemptUnsubscribe for every message id given, deduping identical
 * List-Unsubscribe values first (a newsletter's messages all point to the same
 * link — no reason to hit it once per email).
 */
export async function unsubscribeFromMessages(messageIds: string[]): Promise<BulkUnsubscribeSummary> {
  const messages = await db.message.findMany({
    where: { id: { in: messageIds }, listUnsubscribe: { not: null } },
    select: { id: true, accountId: true, listUnsubscribe: true, listUnsubscribePost: true },
  });

  const seen = new Set<string>();
  const summary: BulkUnsubscribeSummary = { attempted: 0, success: 0, unsupported: 0, failed: 0 };

  for (const message of messages) {
    const key = message.listUnsubscribe!;
    if (seen.has(key)) continue;
    seen.add(key);

    summary.attempted++;
    const { result, detail } = await attemptUnsubscribe(message.listUnsubscribe!, message.listUnsubscribePost);
    summary[result === "success" ? "success" : result === "unsupported" ? "unsupported" : "failed"]++;

    await db.auditLog.create({
      data: {
        actor: "USER",
        action: "unsubscribe",
        accountId: message.accountId,
        messageIds: JSON.stringify([message.id]),
        after: JSON.stringify({ result, detail }),
      },
    });
  }

  return summary;
}
