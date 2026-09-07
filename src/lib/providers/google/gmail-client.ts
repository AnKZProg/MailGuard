const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

const METADATA_HEADERS = [
  "From",
  "To",
  "Reply-To",
  "Subject",
  "Date",
  "Message-ID",
  "List-Unsubscribe",
  "List-Unsubscribe-Post",
  "List-Id",
  "Precedence",
  "Authentication-Results",
  "Received-SPF",
];

export class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GmailApiError";
  }
}

async function gmailFetch(accessToken: string, path: string, params?: Record<string, string | string[]>): Promise<Response> {
  const url = new URL(`${GMAIL_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, v);
      } else {
        url.searchParams.set(key, value);
      }
    }
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const retryAfter = response.headers.get("Retry-After");
    throw new GmailApiError(
      `Requête Gmail échouée: ${path} (${response.status})`,
      response.status,
      retryAfter ? Number(retryAfter) : undefined,
    );
  }
  return response;
}

export type GmailMessagePart = {
  filename?: string;
  mimeType?: string;
  parts?: GmailMessagePart[];
};

export type GmailMessageHeader = { name: string; value: string };

export type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailMessageHeader[];
    parts?: GmailMessagePart[];
    filename?: string;
  };
};

type ListMessagesResponse = {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
};

/**
 * Gmail's default list scope excludes SPAM and TRASH unless the query says
 * otherwise — `scope: "spam"` adds `in:spam` so already-filtered junk mail is
 * still visible to MailGuard instead of silently invisible in both places.
 */
export async function listMessageIds(
  accessToken: string,
  sinceEpochSeconds: number,
  pageToken?: string,
  scope: "default" | "spam" = "default",
) {
  const q = scope === "spam" ? `after:${sinceEpochSeconds} in:spam` : `after:${sinceEpochSeconds}`;
  const response = await gmailFetch(accessToken, "/messages", {
    q,
    maxResults: "100",
    ...(pageToken ? { pageToken } : {}),
  });
  return (await response.json()) as ListMessagesResponse;
}

export async function getMessageMetadata(accessToken: string, messageId: string): Promise<GmailMessage> {
  const response = await gmailFetch(accessToken, `/messages/${messageId}`, {
    format: "metadata",
    metadataHeaders: METADATA_HEADERS,
  });
  return (await response.json()) as GmailMessage;
}

export async function ensureLabel(accessToken: string, labelName: string): Promise<string> {
  const listResponse = await gmailFetch(accessToken, "/labels");
  const { labels } = (await listResponse.json()) as { labels?: { id: string; name: string }[] };
  const existing = labels?.find((label) => label.name === labelName);
  if (existing) return existing.id;

  const createResponse = await fetch(`${GMAIL_BASE}/labels`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: labelName, labelListVisibility: "labelShow", messageListVisibility: "show" }),
  });
  if (!createResponse.ok) {
    throw new GmailApiError(`Création du label Gmail échouée: ${labelName}`, createResponse.status);
  }
  const created = (await createResponse.json()) as { id: string };
  return created.id;
}

export async function listLabelsByPrefix(accessToken: string, prefix: string): Promise<{ id: string; name: string }[]> {
  const response = await gmailFetch(accessToken, "/labels");
  const { labels } = (await response.json()) as { labels?: { id: string; name: string }[] };
  return (labels ?? []).filter((label) => label.name.startsWith(prefix));
}

const SYSTEM_LABEL_IDS = /^(INBOX|SENT|DRAFT|TRASH|SPAM|STARRED|UNREAD|IMPORTANT|CHAT)$/;

/** Every user-created label (system ones like INBOX/SPAM/CATEGORY_* excluded). */
export async function listCustomLabels(accessToken: string): Promise<{ id: string; name: string }[]> {
  const response = await gmailFetch(accessToken, "/labels");
  const { labels } = (await response.json()) as { labels?: { id: string; name: string }[] };
  return (labels ?? []).filter((label) => !SYSTEM_LABEL_IDS.test(label.id) && !label.id.startsWith("CATEGORY_"));
}

/** Renaming a label re-parents it in Gmail's UI (hierarchy is purely name-based,
 * inferred from "/") without touching which messages carry it. */
export async function renameLabel(accessToken: string, labelId: string, newName: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/labels/${labelId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: newName }),
  });
  if (!response.ok) {
    throw new GmailApiError(`Renommage du label Gmail échoué: ${labelId}`, response.status);
  }
}

/** Deleting a Gmail label does not delete the messages that had it — they simply
 * lose that label, keeping whatever other labels they have. */
export async function deleteLabel(accessToken: string, labelId: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/labels/${labelId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new GmailApiError(`Suppression du label Gmail échouée: ${labelId}`, response.status);
  }
}

export async function modifyLabels(
  accessToken: string,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/messages/${messageId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  });
  if (!response.ok) {
    throw new GmailApiError(`Modification des labels Gmail échouée: ${messageId}`, response.status);
  }
}

type MessageBody = { contentType: "text" | "html"; content: string };

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function findBodyPart(part: GmailMessagePart | undefined, mimeType: string): string | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType) {
    const data = (part as GmailMessagePart & { body?: { data?: string } }).body?.data;
    return data ? decodeBase64Url(data) : undefined;
  }
  for (const child of part.parts ?? []) {
    const found = findBodyPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

/** Fetched only on demand when the user opens a message — never during sync. */
export async function getMessageBody(accessToken: string, messageId: string): Promise<MessageBody> {
  const response = await gmailFetch(accessToken, `/messages/${messageId}`, { format: "full" });
  const raw = (await response.json()) as GmailMessage;

  const html = findBodyPart(raw.payload, "text/html");
  if (html) return { contentType: "html", content: html };

  const text = findBodyPart(raw.payload, "text/plain");
  return { contentType: "text", content: text ?? raw.snippet ?? "" };
}

/**
 * A 404 means the message is already gone (already trashed/deleted by a
 * previous run or directly by the user) — that's the goal state this call was
 * trying to reach anyway, so it's treated as success rather than a failure a
 * caller has to retry forever.
 */
export async function trashMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/messages/${messageId}/trash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new GmailApiError(`Mise à la corbeille Gmail échouée: ${messageId}`, response.status);
  }
}

export async function listTrashMessageIds(accessToken: string): Promise<string[]> {
  return listMessageIdsByLabel(accessToken, "TRASH");
}

/** Enumerates every message currently carrying the given label id (used to find
 * whatever is still sitting in a custom label for cleanup/migration). */
export async function listMessageIdsByLabel(accessToken: string, labelId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const response = await gmailFetch(accessToken, "/messages", {
      labelIds: [labelId],
      maxResults: "100",
      ...(pageToken ? { pageToken } : {}),
    });
    const page = (await response.json()) as ListMessagesResponse;
    for (const m of page.messages ?? []) ids.push(m.id);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return ids;
}

/**
 * A 404 means the message is already gone from the trash (already restored or
 * hard-deleted elsewhere) — that's the goal state, so it's treated as success.
 */
export async function untrashMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/messages/${messageId}/untrash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok && response.status !== 404) {
    throw new GmailApiError(`Sortie de la corbeille Gmail échouée: ${messageId}`, response.status);
  }
}

export class InsufficientScopeError extends Error {}

/**
 * Permanent delete — requires the `https://mail.google.com/` scope, which
 * MailGuard does NOT request (gmail.modify covers trash/labels only, not hard
 * delete). Throws InsufficientScopeError on 403 so callers can report the
 * limitation clearly instead of a generic failure.
 */
export async function permanentlyDeleteMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(`${GMAIL_BASE}/messages/${messageId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 403) {
    throw new InsufficientScopeError("Suppression définitive Gmail : autorisation insuffisante (scope mail.google.com requis)");
  }
  if (!response.ok && response.status !== 404) {
    throw new GmailApiError(`Suppression définitive Gmail échouée: ${messageId}`, response.status);
  }
}
