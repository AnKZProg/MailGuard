import { normalizeForMatching } from "@/lib/classify/text-normalize";

export type MessageFeatures = {
  fromAddress: string;
  fromDomain: string;
  fromDisplayName: string | null;
  replyToDomain: string | null;
  replyToMismatch: boolean;
  punycodeDomain: boolean;
  subjectLower: string;
  /** Provider-supplied preview line (~first 200 chars) — never the full body. */
  snippetLower: string;
  /** No earlier message from this exact address on this account. */
  isFirstContact: boolean;
  toCount: number;
  hasAttachments: boolean;
  attachmentTypes: string[];
  isBulk: boolean;
  authSpfFail: boolean;
  authDkimFail: boolean;
  authDmarcFail: boolean;
  providerSpamFlag: boolean;
};

/** The subset of a stored Message row the classifier needs. The full body is never
 * read; only the short snippet the provider already returns with the metadata. */
export type ClassifiableMessage = {
  fromAddress: string;
  fromDomain: string;
  fromDisplayName: string | null;
  replyToDomain: string | null;
  subject: string;
  snippet?: string | null;
  toCount: number;
  hasAttachments: boolean;
  attachmentTypes: string | null;
  listUnsubscribe: string | null;
  listId: string | null;
  precedence: string | null;
  authSpf: string | null;
  authDkim: string | null;
  authDmarc: string | null;
  providerSpamFlag: boolean;
};

export type FeatureContext = { isFirstContact?: boolean };

export function extractFeatures(message: ClassifiableMessage, context: FeatureContext = {}): MessageFeatures {
  const replyToDomain = message.replyToDomain;
  return {
    fromAddress: message.fromAddress,
    fromDomain: message.fromDomain,
    fromDisplayName: message.fromDisplayName,
    replyToDomain,
    replyToMismatch: Boolean(replyToDomain && replyToDomain !== message.fromDomain),
    punycodeDomain: message.fromDomain.includes("xn--"),
    subjectLower: normalizeForMatching(message.subject),
    snippetLower: normalizeForMatching(message.snippet ?? ""),
    isFirstContact: context.isFirstContact ?? false,
    toCount: message.toCount,
    hasAttachments: message.hasAttachments,
    attachmentTypes: message.attachmentTypes ? message.attachmentTypes.split(",").filter(Boolean) : [],
    isBulk: Boolean(
      message.listUnsubscribe || message.listId || (message.precedence && /bulk|list/i.test(message.precedence)),
    ),
    authSpfFail: message.authSpf !== null && message.authSpf !== "pass",
    authDkimFail: message.authDkim !== null && message.authDkim !== "pass",
    authDmarcFail: message.authDmarc !== null && message.authDmarc !== "pass",
    providerSpamFlag: message.providerSpamFlag,
  };
}
