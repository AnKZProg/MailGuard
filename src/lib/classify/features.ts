import { normalizeForMatching } from "@/lib/classify/text-normalize";

export type MessageFeatures = {
  fromAddress: string;
  fromDomain: string;
  fromDisplayName: string | null;
  replyToDomain: string | null;
  replyToMismatch: boolean;
  punycodeDomain: boolean;
  subjectLower: string;
  toCount: number;
  hasAttachments: boolean;
  attachmentTypes: string[];
  isBulk: boolean;
  authSpfFail: boolean;
  authDkimFail: boolean;
  authDmarcFail: boolean;
  providerSpamFlag: boolean;
};

/** The subset of a stored Message row the classifier needs — never includes a body field. */
export type ClassifiableMessage = {
  fromAddress: string;
  fromDomain: string;
  fromDisplayName: string | null;
  replyToDomain: string | null;
  subject: string;
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

export function extractFeatures(message: ClassifiableMessage): MessageFeatures {
  const replyToDomain = message.replyToDomain;
  return {
    fromAddress: message.fromAddress,
    fromDomain: message.fromDomain,
    fromDisplayName: message.fromDisplayName,
    replyToDomain,
    replyToMismatch: Boolean(replyToDomain && replyToDomain !== message.fromDomain),
    punycodeDomain: message.fromDomain.includes("xn--"),
    subjectLower: normalizeForMatching(message.subject),
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
