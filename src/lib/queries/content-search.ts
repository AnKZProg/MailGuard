import { db } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/concurrency";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { searchMessageIds as searchGmail } from "@/lib/providers/google/gmail-client";
import { searchMessageIds as searchGraph } from "@/lib/providers/microsoft/graph-client";

const RESULTS_PER_ACCOUNT = 100;
const ACCOUNT_TIMEOUT_MS = 8_000;
const CONCURRENCY = 6;

export type ContentSearchResult = {
  /** Provider message ids that matched, per account — only some may be synced locally. */
  matches: { accountId: string; providerMessageIds: string[] }[];
  failedAccounts: string[];
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/**
 * Full-text search runs on the provider (Gmail `q`, Graph `$search`), which already
 * indexes every body — MailGuard never downloads or stores bodies to search them.
 */
export async function searchMailContent(query: string, accountId?: string): Promise<ContentSearchResult> {
  const accounts = await db.account.findMany({
    where: { status: "ACTIVE", ...(accountId ? { id: accountId } : {}) },
    select: { id: true, provider: true, emailAddress: true },
  });

  const settled = await mapWithConcurrency(accounts, CONCURRENCY, async (account) => {
    const token = await getValidAccessToken(account.id);
    const search = account.provider === "GOOGLE" ? searchGmail : searchGraph;
    const ids = await withTimeout(search(token, query, RESULTS_PER_ACCOUNT), ACCOUNT_TIMEOUT_MS);
    return { accountId: account.id, providerMessageIds: ids };
  });

  const matches: ContentSearchResult["matches"] = [];
  const failedAccounts: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") matches.push(result.value);
    else {
      failedAccounts.push(accounts[i].emailAddress);
      console.error(`[content-search] ${accounts[i].emailAddress}`, result.reason);
    }
  });
  return { matches, failedAccounts };
}
