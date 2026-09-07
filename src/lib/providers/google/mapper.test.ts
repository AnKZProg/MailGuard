import { describe, expect, it } from "vitest";
import { mapGmailMessage } from "./mapper";
import type { GmailMessage } from "./gmail-client";

function baseMessage(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: "msg-1",
    threadId: "thread-1",
    labelIds: ["INBOX"],
    snippet: "Bonjour, voici votre relevé...",
    internalDate: "1700000000000",
    payload: {
      headers: [
        { name: "From", value: '"Ma Banque" <no-reply@mabanque.fr>' },
        { name: "To", value: "moi@example.com" },
        { name: "Subject", value: "Votre relevé de compte" },
        { name: "Message-ID", value: "<abc@mabanque.fr>" },
        { name: "Authentication-Results", value: "mx.google.com; spf=pass; dkim=pass; dmarc=pass" },
      ],
      parts: [],
    },
    ...overrides,
  };
}

describe("mapGmailMessage", () => {
  it("maps a plain legitimate message", () => {
    const result = mapGmailMessage(baseMessage());
    expect(result.fromAddress).toBe("no-reply@mabanque.fr");
    expect(result.fromDomain).toBe("mabanque.fr");
    expect(result.fromDisplayName).toBe("Ma Banque");
    expect(result.subject).toBe("Votre relevé de compte");
    expect(result.authSpf).toBe("pass");
    expect(result.authDkim).toBe("pass");
    expect(result.authDmarc).toBe("pass");
    expect(result.isRead).toBe(true);
    expect(result.providerSpamFlag).toBe(false);
    expect(result.hasAttachments).toBe(false);
    expect(result.receivedAt.getTime()).toBe(1700000000000);
  });

  it("flags unread messages via the UNREAD label", () => {
    const result = mapGmailMessage(baseMessage({ labelIds: ["INBOX", "UNREAD"] }));
    expect(result.isRead).toBe(false);
  });

  it("flags provider spam via the SPAM label", () => {
    const result = mapGmailMessage(baseMessage({ labelIds: ["SPAM"] }));
    expect(result.providerSpamFlag).toBe(true);
    expect(result.providerFolder).toBe("SPAM");
  });

  it("detects attachments and collects their extensions", () => {
    const result = mapGmailMessage(
      baseMessage({
        payload: {
          headers: [{ name: "From", value: "a@b.com" }],
          parts: [
            { mimeType: "text/plain" },
            { mimeType: "application/pdf", filename: "facture.pdf" },
            { mimeType: "multipart/mixed", parts: [{ mimeType: "application/zip", filename: "archive.ZIP" }] },
          ],
        },
      }),
    );
    expect(result.hasAttachments).toBe(true);
    expect(result.attachmentTypes.sort()).toEqual(["pdf", "zip"]);
  });

  it("derives reply-to domain when present", () => {
    const result = mapGmailMessage(
      baseMessage({
        payload: {
          headers: [
            { name: "From", value: "a@legit.com" },
            { name: "Reply-To", value: "b@attacker.evil" },
          ],
        },
      }),
    );
    expect(result.replyToDomain).toBe("attacker.evil");
  });

  it("falls back to Received-SPF when Authentication-Results is absent", () => {
    const result = mapGmailMessage(
      baseMessage({
        payload: {
          headers: [
            { name: "From", value: "a@b.com" },
            { name: "Received-SPF", value: "pass (google.com: domain of a@b.com designates 1.2.3.4 as permitted sender)" },
          ],
        },
      }),
    );
    expect(result.authSpf).toBe("pass");
  });

  it("handles a message with no headers gracefully", () => {
    const result = mapGmailMessage({ id: "x", threadId: "y" });
    expect(result.fromAddress).toBe("");
    expect(result.subject).toBe("");
    expect(result.providerLabels).toEqual([]);
  });
});
