import type { NormalizedMessage } from "@/lib/mail/types";
import type { GraphMessage } from "./graph-client";
import { domainOf, parseAuthenticationResults } from "@/lib/mail/headers";

function header(headers: { name: string; value: string }[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function extractAttachmentExtensions(attachments: { name?: string }[] | undefined): string[] {
  const extensions = new Set<string>();
  for (const attachment of attachments ?? []) {
    const name = attachment.name?.trim();
    if (!name) continue;
    const ext = name.split(".").pop();
    if (ext && ext !== name) extensions.add(ext.toLowerCase());
  }
  return [...extensions];
}

export function mapGraphMessage(raw: GraphMessage, junkFolderId: string | null, isKnownJunk = false): NormalizedMessage {
  const headers = raw.internetMessageHeaders;
  const fromAddress = raw.from?.emailAddress?.address?.toLowerCase() ?? "";
  const replyToAddress = raw.replyTo?.[0]?.emailAddress?.address?.toLowerCase();
  const auth = parseAuthenticationResults(header(headers, "Authentication-Results"));

  return {
    providerMessageId: raw.id,
    threadId: raw.conversationId,
    internetMessageId: raw.internetMessageId ?? null,

    fromAddress,
    fromDomain: domainOf(fromAddress),
    fromDisplayName: raw.from?.emailAddress?.name ?? null,
    replyToDomain: replyToAddress ? domainOf(replyToAddress) : null,
    toCount: raw.toRecipients?.length ?? 0,

    subject: raw.subject ?? "",
    snippet: raw.bodyPreview ?? null,
    receivedAt: new Date(raw.receivedDateTime),
    isRead: raw.isRead,
    hasAttachments: raw.hasAttachments,
    attachmentTypes: extractAttachmentExtensions(raw.attachments),

    listUnsubscribe: header(headers, "List-Unsubscribe") ?? null,
    listUnsubscribePost: header(headers, "List-Unsubscribe-Post") ?? null,
    listId: header(headers, "List-Id") ?? null,
    precedence: header(headers, "Precedence") ?? null,

    authSpf: auth.spf,
    authDkim: auth.dkim,
    authDmarc: auth.dmarc,

    providerSpamFlag: isKnownJunk || (junkFolderId !== null && raw.parentFolderId === junkFolderId),
    providerFolder: raw.parentFolderId ?? null,
    providerLabels: raw.inferenceClassification ? [raw.inferenceClassification] : [],
  };
}
