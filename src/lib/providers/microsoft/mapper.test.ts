import { describe, expect, it } from "vitest";
import { mapGraphMessage } from "./mapper";
import type { GraphMessage } from "./graph-client";

function baseMessage(overrides: Partial<GraphMessage> = {}): GraphMessage {
  return {
    id: "msg-1",
    conversationId: "thread-1",
    internetMessageId: "<abc@mabanque.fr>",
    from: { emailAddress: { name: "Ma Banque", address: "No-Reply@MaBanque.fr" } },
    toRecipients: [{ emailAddress: { address: "moi@example.com" } }],
    subject: "Votre relevé de compte",
    bodyPreview: "Bonjour, voici votre relevé...",
    receivedDateTime: "2026-01-15T10:00:00Z",
    isRead: true,
    hasAttachments: false,
    parentFolderId: "inbox-folder-id",
    ...overrides,
  };
}

describe("mapGraphMessage", () => {
  it("maps a plain legitimate message", () => {
    const result = mapGraphMessage(baseMessage(), null);
    expect(result.fromAddress).toBe("no-reply@mabanque.fr");
    expect(result.fromDomain).toBe("mabanque.fr");
    expect(result.fromDisplayName).toBe("Ma Banque");
    expect(result.toCount).toBe(1);
    expect(result.isRead).toBe(true);
    expect(result.providerSpamFlag).toBe(false);
    expect(result.receivedAt.toISOString()).toBe("2026-01-15T10:00:00.000Z");
  });

  it("flags provider spam when parentFolderId matches the junk folder", () => {
    const result = mapGraphMessage(baseMessage({ parentFolderId: "junk-id" }), "junk-id");
    expect(result.providerSpamFlag).toBe(true);
  });

  it("flags provider spam when explicitly fetched from the junk folder, regardless of parentFolderId", () => {
    const result = mapGraphMessage(baseMessage({ parentFolderId: "some-other-id" }), null, true);
    expect(result.providerSpamFlag).toBe(true);
  });

  it("does not flag spam when junkFolderId is unknown (null)", () => {
    const result = mapGraphMessage(baseMessage({ parentFolderId: "junk-id" }), null);
    expect(result.providerSpamFlag).toBe(false);
  });

  it("derives reply-to domain from the first replyTo recipient", () => {
    const result = mapGraphMessage(baseMessage({ replyTo: [{ emailAddress: { address: "b@attacker.evil" } }] }), null);
    expect(result.replyToDomain).toBe("attacker.evil");
  });

  it("captures inferenceClassification as a provider label", () => {
    const result = mapGraphMessage(baseMessage({ inferenceClassification: "other" }), null);
    expect(result.providerLabels).toEqual(["other"]);
  });

  it("reads spf/dkim/dmarc from Authentication-Results when present in headers", () => {
    const result = mapGraphMessage(
      baseMessage({
        internetMessageHeaders: [{ name: "Authentication-Results", value: "spectrum.local; spf=fail; dkim=none; dmarc=fail" }],
      }),
      null,
    );
    expect(result.authSpf).toBe("fail");
    expect(result.authDkim).toBe("none");
    expect(result.authDmarc).toBe("fail");
  });

  it("handles a message with no from address gracefully", () => {
    const result = mapGraphMessage(baseMessage({ from: undefined }), null);
    expect(result.fromAddress).toBe("");
    expect(result.fromDomain).toBe("");
  });
});
