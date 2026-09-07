const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const SELECT_FIELDS = [
  "id",
  "conversationId",
  "internetMessageId",
  "from",
  "replyTo",
  "toRecipients",
  "subject",
  "bodyPreview",
  "receivedDateTime",
  "isRead",
  "hasAttachments",
  "internetMessageHeaders",
  "parentFolderId",
  "inferenceClassification",
  "attachments",
].join(",");

export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

async function graphFetch(accessToken: string, url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    throw new GraphApiError(
      `Requête Graph échouée: ${url} (${response.status})`,
      response.status,
      retryAfter ? Number(retryAfter) : undefined,
    );
  }
  return response;
}

export type GraphRecipient = { emailAddress?: { name?: string; address?: string } };
export type GraphInternetMessageHeader = { name: string; value: string };

export type GraphMessage = {
  id: string;
  conversationId: string;
  internetMessageId?: string;
  from?: GraphRecipient;
  replyTo?: GraphRecipient[];
  toRecipients?: GraphRecipient[];
  subject?: string;
  bodyPreview?: string;
  receivedDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  internetMessageHeaders?: GraphInternetMessageHeader[];
  parentFolderId?: string;
  inferenceClassification?: "focused" | "other";
  attachments?: { name?: string }[];
};

type ListMessagesResponse = {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
};

export async function listMessages(
  accessToken: string,
  sinceIso: string,
  folder: "inbox" | "junkemail" = "inbox",
  nextLink?: string,
): Promise<ListMessagesResponse> {
  if (nextLink) {
    const response = await graphFetch(accessToken, nextLink);
    return (await response.json()) as ListMessagesResponse;
  }
  const url = new URL(`${GRAPH_BASE}/me/mailFolders/${folder}/messages`);
  url.searchParams.set("$select", SELECT_FIELDS);
  url.searchParams.set("$filter", `receivedDateTime ge ${sinceIso}`);
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$top", "50");
  // Attachment filenames (name only, not content) folded into the same list
  // request via $expand instead of a separate per-message /attachments call —
  // the risky-extension phishing signal was otherwise permanently blind for
  // every Outlook account (hasAttachments alone doesn't say .exe vs .pdf).
  url.searchParams.set("$expand", "attachments($select=name)");
  const response = await graphFetch(accessToken, url.toString());
  return (await response.json()) as ListMessagesResponse;
}

export async function getWellKnownFolderId(
  accessToken: string,
  wellKnownName: "junkemail" | "deleteditems" | "inbox" | "archive",
): Promise<string> {
  const response = await graphFetch(accessToken, `${GRAPH_BASE}/me/mailFolders/${wellKnownName}`);
  const folder = (await response.json()) as { id: string };
  return folder.id;
}

export async function ensureFolder(accessToken: string, displayName: string): Promise<string> {
  const listUrl = new URL(`${GRAPH_BASE}/me/mailFolders`);
  listUrl.searchParams.set("$filter", `displayName eq '${displayName.replace(/'/g, "''")}'`);
  const listResponse = await graphFetch(accessToken, listUrl.toString());
  const { value } = (await listResponse.json()) as { value: { id: string }[] };
  if (value.length > 0) return value[0].id;

  const createResponse = await graphFetch(accessToken, `${GRAPH_BASE}/me/mailFolders`, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
  const created = (await createResponse.json()) as { id: string };
  return created.id;
}

/** Same as ensureFolder but scoped under a parent folder, for a small hierarchy
 * (e.g. "MailGuard" > "<subject>") instead of cluttering the top-level folder list. */
export async function ensureChildFolder(accessToken: string, parentFolderId: string, displayName: string): Promise<string> {
  const listUrl = new URL(`${GRAPH_BASE}/me/mailFolders/${parentFolderId}/childFolders`);
  listUrl.searchParams.set("$filter", `displayName eq '${displayName.replace(/'/g, "''")}'`);
  const listResponse = await graphFetch(accessToken, listUrl.toString());
  const { value } = (await listResponse.json()) as { value: { id: string }[] };
  if (value.length > 0) return value[0].id;

  const createResponse = await graphFetch(accessToken, `${GRAPH_BASE}/me/mailFolders/${parentFolderId}/childFolders`, {
    method: "POST",
    body: JSON.stringify({ displayName }),
  });
  const created = (await createResponse.json()) as { id: string };
  return created.id;
}

export type FolderInfo = { id: string; displayName: string; totalItemCount: number };

/** Every top-level mail folder, unfiltered — callers exclude well-known folders
 * (inbox, sent, drafts, ...) themselves via getWellKnownFolderId comparisons. */
export async function listTopLevelFolders(accessToken: string): Promise<FolderInfo[]> {
  const folders: FolderInfo[] = [];
  let url: string | undefined = `${GRAPH_BASE}/me/mailFolders?$top=100`;
  while (url) {
    const response = await graphFetch(accessToken, url);
    const page = (await response.json()) as { value: FolderInfo[]; "@odata.nextLink"?: string };
    folders.push(...page.value);
    url = page["@odata.nextLink"];
  }
  return folders;
}

export type MessageSender = { id: string; from?: GraphRecipient };

/**
 * Paginates every message in a folder (no date filter — the full history, not
 * just what a sync window would cover) returning just enough to group by
 * sender: id + from. Used for a one-off full-mailbox organize pass, never the
 * regular sync path.
 */
export async function listAllMessagesWithSender(accessToken: string, folder: string): Promise<MessageSender[]> {
  const messages: MessageSender[] = [];
  let url: string | undefined = (() => {
    const u = new URL(`${GRAPH_BASE}/me/mailFolders/${folder}/messages`);
    u.searchParams.set("$select", "id,from");
    u.searchParams.set("$top", "100");
    return u.toString();
  })();

  while (url) {
    const response = await graphFetch(accessToken, url);
    const page = (await response.json()) as { value: MessageSender[]; "@odata.nextLink"?: string };
    messages.push(...page.value);
    url = page["@odata.nextLink"];
  }
  return messages;
}

/** Direct children of a folder — used to find/reuse a brand folder already
 * nested under an organizing parent, instead of re-listing the whole tree. */
export async function listChildFolders(accessToken: string, parentFolderId: string): Promise<FolderInfo[]> {
  const folders: FolderInfo[] = [];
  let url: string | undefined = `${GRAPH_BASE}/me/mailFolders/${parentFolderId}/childFolders?$top=100`;
  while (url) {
    const response = await graphFetch(accessToken, url);
    const page = (await response.json()) as { value: FolderInfo[]; "@odata.nextLink"?: string };
    folders.push(...page.value);
    url = page["@odata.nextLink"];
  }
  return folders;
}

/** Moves an entire folder (and everything in it) to become a child of another
 * folder — used to nest a folder created before the "one parent per account"
 * layout existed, without touching the messages inside it individually. */
export async function moveFolder(accessToken: string, folderId: string, destinationParentId: string): Promise<void> {
  await graphFetch(accessToken, `${GRAPH_BASE}/me/mailFolders/${folderId}/move`, {
    method: "POST",
    body: JSON.stringify({ destinationId: destinationParentId }),
  });
}

export async function findFolderIdByName(accessToken: string, displayName: string): Promise<string | null> {
  const listUrl = new URL(`${GRAPH_BASE}/me/mailFolders`);
  listUrl.searchParams.set("$filter", `displayName eq '${displayName.replace(/'/g, "''")}'`);
  const listResponse = await graphFetch(accessToken, listUrl.toString());
  const { value } = (await listResponse.json()) as { value: { id: string }[] };
  return value[0]?.id ?? null;
}

/** Deleting a folder that still has messages in it moves them to Deleted Items —
 * callers that want the messages preserved elsewhere must move them out first. */
export async function deleteFolder(accessToken: string, folderId: string): Promise<void> {
  const response = await fetch(`${GRAPH_BASE}/me/mailFolders/${folderId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new GraphApiError(`Suppression du dossier Outlook échouée: ${folderId}`, response.status);
  }
}

/**
 * A 404 here means the message is already gone (moved/deleted by a previous
 * run, or by the user directly in their mailbox) — that's the goal state this
 * call was trying to reach anyway, so it's treated as success rather than a
 * failure a caller has to retry forever.
 */
export async function moveMessage(accessToken: string, messageId: string, destinationFolderId: string): Promise<void> {
  const response = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/move`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId: destinationFolderId }),
  });
  if (!response.ok && response.status !== 404) {
    throw new GraphApiError(`Déplacement Outlook échoué: ${messageId}`, response.status);
  }
}

export async function listDeletedItemsMessageIds(accessToken: string): Promise<string[]> {
  return listMessageIdsInFolder(accessToken, "deleteditems");
}

/** Enumerates every message id currently sitting in the given folder (well-known
 * name or a folder id), used to find whatever is still in a custom folder for
 * cleanup/migration. */
export async function listMessageIdsInFolder(accessToken: string, folder: string): Promise<string[]> {
  const ids: string[] = [];
  let url: string | undefined = (() => {
    const u = new URL(`${GRAPH_BASE}/me/mailFolders/${folder}/messages`);
    u.searchParams.set("$select", "id");
    u.searchParams.set("$top", "100");
    return u.toString();
  })();

  while (url) {
    const response = await graphFetch(accessToken, url);
    const page = (await response.json()) as { value: { id: string }[]; "@odata.nextLink"?: string };
    for (const m of page.value) ids.push(m.id);
    url = page["@odata.nextLink"];
  }
  return ids;
}

/**
 * Permanent delete. On a message already in Deleted Items, Graph moves it to the
 * mailbox's Recoverable Items/Purges — no longer reachable from Outlook/OWA, the
 * closest thing to "gone" this API offers without an Exchange admin.
 */
export async function permanentlyDeleteMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(`${GRAPH_BASE}/me/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new GraphApiError(`Suppression définitive Outlook échouée: ${messageId}`, response.status);
  }
}

type MessageBody = { contentType: "text" | "html"; content: string };

/** Fetched only on demand when the user opens a message — never during sync. */
export async function getMessageBody(accessToken: string, messageId: string): Promise<MessageBody> {
  const url = new URL(`${GRAPH_BASE}/me/messages/${messageId}`);
  url.searchParams.set("$select", "body");
  const response = await graphFetch(accessToken, url.toString());
  const raw = (await response.json()) as { body?: { contentType?: string; content?: string } };
  const contentType = raw.body?.contentType === "text" ? "text" : "html";
  return { contentType, content: raw.body?.content ?? "" };
}

type InboxRule = { id: string; displayName: string; actions?: Record<string, unknown>; conditions?: Record<string, unknown> };

export async function listInboxRules(accessToken: string): Promise<InboxRule[]> {
  const response = await graphFetch(accessToken, `${GRAPH_BASE}/me/mailFolders/inbox/messageRules`);
  const { value } = (await response.json()) as { value: InboxRule[] };
  return value;
}

type RuleConditions = {
  fromAddresses?: { emailAddress?: { address?: string } }[];
  senderContains?: string[];
};

/**
 * Creates an inbox rule that moves future mail matching `pattern` straight to
 * the Junk Email folder — the Outlook equivalent of Gmail's spam filter, and
 * just as reversible (the mail still lands somewhere findable, not deleted).
 * `scope: "ADDRESS"` matches the exact sender address; `"DOMAIN"` matches any
 * sender whose address contains `@domain`. No-ops if an equivalent rule
 * already exists.
 */
export async function ensureSenderBlockRule(
  accessToken: string,
  pattern: string,
  scope: "ADDRESS" | "DOMAIN",
  junkFolderId: string,
): Promise<void> {
  const matchValue = scope === "DOMAIN" ? `@${pattern}` : pattern;
  const existing = await listInboxRules(accessToken);
  const alreadyBlocked = existing.some((rule) => {
    const conditions = rule.conditions as RuleConditions | undefined;
    if (scope === "ADDRESS") {
      return (conditions?.fromAddresses ?? []).some((a) => a.emailAddress?.address?.toLowerCase() === matchValue.toLowerCase());
    }
    return (conditions?.senderContains ?? []).some((s) => s.toLowerCase() === matchValue.toLowerCase());
  });
  if (alreadyBlocked) return;

  const conditions: RuleConditions =
    scope === "ADDRESS" ? { fromAddresses: [{ emailAddress: { address: matchValue } }] } : { senderContains: [matchValue] };

  const response = await fetch(`${GRAPH_BASE}/me/mailFolders/inbox/messageRules`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: `MailGuard — bloqué: ${matchValue}`,
      sequence: 1,
      isEnabled: true,
      conditions,
      actions: { moveToFolder: junkFolderId, stopProcessingRules: true },
    }),
  });
  if (!response.ok) {
    throw new Error(`Création de la règle Outlook échouée pour ${matchValue} (${response.status})`);
  }
}
