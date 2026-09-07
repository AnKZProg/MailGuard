/**
 * A message reduced to structured, provider-agnostic fields. This is the single
 * chokepoint that keeps the classifier from ever seeing a message body: adapters
 * populate this type from list/metadata API calls only, never a full-body fetch.
 */
export type NormalizedMessage = {
  providerMessageId: string;
  threadId: string;
  internetMessageId: string | null;

  fromAddress: string;
  fromDomain: string;
  fromDisplayName: string | null;
  replyToDomain: string | null;
  toCount: number;

  subject: string;
  snippet: string | null;
  receivedAt: Date;
  isRead: boolean;
  hasAttachments: boolean;
  attachmentTypes: string[];

  listUnsubscribe: string | null;
  /** Raw `List-Unsubscribe-Post` header — presence of "List-Unsubscribe=One-Click" (RFC 8058) means the URL in listUnsubscribe accepts a one-click POST instead of requiring a GET. */
  listUnsubscribePost: string | null;
  listId: string | null;
  precedence: string | null;

  authSpf: string | null;
  authDkim: string | null;
  authDmarc: string | null;

  providerSpamFlag: boolean;
  providerFolder: string | null;
  providerLabels: string[];
};
