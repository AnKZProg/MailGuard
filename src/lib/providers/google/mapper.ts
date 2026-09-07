import type { NormalizedMessage } from "@/lib/mail/types";
import type { GmailMessage, GmailMessagePart } from "./gmail-client";
import { parseAddressHeader, domainOf, parseAuthenticationResults, countRecipients } from "@/lib/mail/headers";

function header(headers: { name: string; value: string }[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

function collectAttachmentExtensions(part: GmailMessagePart | undefined, acc: Set<string>): void {
  if (!part) return;
  if (part.filename && part.filename.trim().length > 0) {
    const ext = part.filename.split(".").pop();
    if (ext) acc.add(ext.toLowerCase());
  }
  for (const child of part.parts ?? []) collectAttachmentExtensions(child, acc);
}

export function mapGmailMessage(raw: GmailMessage): NormalizedMessage {
  const headers = raw.payload?.headers;
  const from = parseAddressHeader(header(headers, "From"));
  const replyTo = parseAddressHeader(header(headers, "Reply-To"));
  const auth = parseAuthenticationResults(header(headers, "Authentication-Results"));
  const receivedSpf = header(headers, "Received-SPF");

  const attachmentExtensions = new Set<string>();
  collectAttachmentExtensions(raw.payload, attachmentExtensions);

  const labelIds = raw.labelIds ?? [];

  return {
    providerMessageId: raw.id,
    threadId: raw.threadId,
    internetMessageId: header(headers, "Message-ID") ?? null,

    fromAddress: from.address,
    fromDomain: domainOf(from.address),
    fromDisplayName: from.name,
    replyToDomain: replyTo.address ? domainOf(replyTo.address) : null,
    toCount: countRecipients(header(headers, "To")),

    subject: header(headers, "Subject") ?? "",
    snippet: raw.snippet ?? null,
    receivedAt: raw.internalDate ? new Date(Number(raw.internalDate)) : new Date(),
    isRead: !labelIds.includes("UNREAD"),
    hasAttachments: attachmentExtensions.size > 0,
    attachmentTypes: [...attachmentExtensions],

    listUnsubscribe: header(headers, "List-Unsubscribe") ?? null,
    listUnsubscribePost: header(headers, "List-Unsubscribe-Post") ?? null,
    listId: header(headers, "List-Id") ?? null,
    precedence: header(headers, "Precedence") ?? null,

    authSpf: auth.spf ?? (receivedSpf ? receivedSpf.split(" ")[0]?.toLowerCase() : null),
    authDkim: auth.dkim,
    authDmarc: auth.dmarc,

    providerSpamFlag: labelIds.includes("SPAM"),
    providerFolder: labelIds.includes("INBOX") ? "INBOX" : (labelIds[0] ?? null),
    providerLabels: labelIds,
  };
}
