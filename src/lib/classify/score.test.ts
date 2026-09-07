import { describe, expect, it } from "vitest";
import { extractFeatures, type ClassifiableMessage } from "@/lib/classify/features";
import { classify } from "@/lib/classify/score";

function message(overrides: Partial<ClassifiableMessage> = {}): ClassifiableMessage {
  return {
    fromAddress: "contact@example.com",
    fromDomain: "example.com",
    fromDisplayName: "Example",
    replyToDomain: null,
    subject: "Bonjour",
    toCount: 1,
    hasAttachments: false,
    attachmentTypes: null,
    listUnsubscribe: null,
    listId: null,
    precedence: null,
    authSpf: "pass",
    authDkim: "pass",
    authDmarc: "pass",
    providerSpamFlag: false,
    ...overrides,
  };
}

describe("classify — golden fixtures", () => {
  it("a DMARC-failing, display-name-impersonating, lookalike-domain email is PHISHING", () => {
    const features = extractFeatures(
      message({
        fromAddress: "support@paypa1.com",
        fromDomain: "paypa1.com",
        fromDisplayName: "PayPal Support",
        replyToDomain: "attacker.ru",
        subject: "Vérifiez votre compte — connexion suspecte détectée",
        authSpf: "fail",
        authDkim: "fail",
        authDmarc: "fail",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("PHISHING");
    expect(result.score).toBeGreaterThanOrEqual(0.55);
  });

  it("a legitimate opt-in newsletter with clean auth is NEWSLETTER, not SPAM", () => {
    const features = extractFeatures(
      message({
        fromAddress: "news@legit-newsletter.com",
        fromDomain: "legit-newsletter.com",
        fromDisplayName: "La Gazette",
        subject: "Votre lettre hebdomadaire",
        listUnsubscribe: "<mailto:unsub@legit-newsletter.com>",
        listId: "gazette.legit-newsletter.com",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("NEWSLETTER");
    expect(result.shouldQuarantine).toBe(false);
  });

  it("an authentic bank notification with passing auth is LEGITIMATE", () => {
    const features = extractFeatures(
      message({
        fromAddress: "no-reply@amazon.fr",
        fromDomain: "amazon.fr",
        fromDisplayName: "Amazon.fr",
        subject: "Votre commande a été expédiée",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("LEGITIMATE");
    expect(result.shouldQuarantine).toBe(false);
  });

  it("a lookalike domain impersonating a protected brand is flagged even with passing auth", () => {
    // Auth can legitimately pass for a domain the attacker actually owns and configured
    // SPF/DKIM/DMARC for — the lookalike domain itself is the tell, not the auth headers.
    const features = extractFeatures(
      message({
        fromAddress: "service@amaz0n.fr",
        fromDomain: "amaz0n.fr",
        fromDisplayName: "Amazon.fr",
        subject: "Confirmez votre identité",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("PHISHING");
  });

  it("a bulk provider-flagged spam email is SPAM", () => {
    const features = extractFeatures(
      message({
        fromAddress: "promo@dealsdealsdeals.biz",
        fromDomain: "dealsdealsdeals.biz",
        subject: "GRATUIT: gagnez un iPhone maintenant !",
        providerSpamFlag: true,
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("SPAM");
    expect(result.shouldQuarantine).toBe(true);
  });

  it("an allowlisted sender is always LEGITIMATE regardless of signals", () => {
    const features = extractFeatures(
      message({
        fromAddress: "support@paypa1.com",
        fromDomain: "paypa1.com",
        authDmarc: "fail",
        providerSpamFlag: true,
      }),
    );
    const result = classify(features, "ALLOW");
    expect(result.verdict).toBe("LEGITIMATE");
    expect(result.shouldQuarantine).toBe(false);
  });

  it("a blocked sender is always quarantine-eligible regardless of signals", () => {
    const features = extractFeatures(message());
    const result = classify(features, "BLOCK");
    expect(result.shouldQuarantine).toBe(true);
  });

  it("a subdomain of a protected domain is not treated as a lookalike", () => {
    const features = extractFeatures(
      message({ fromAddress: "no-reply@notifications.amazon.fr", fromDomain: "notifications.amazon.fr" }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("LEGITIMATE");
  });

  it("flags a brand mentioned in the subject from a domain with no relation to that brand (real case found live)", () => {
    // approve-it.net has zero textual resemblance to amazon.com — the lookalike-domain
    // signal can't catch this, only the brand-in-subject check can.
    const features = extractFeatures(
      message({
        fromAddress: "no-reply@approve-it.net",
        fromDomain: "approve-it.net",
        fromDisplayName: "Prime Video",
        subject: "Merci de continuer votre aventure avec PrimeVideo",
        authDmarc: "bestguesspass",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("PHISHING");
  });

  it("does not flag a brand mention when the sender genuinely owns one of its listed domains", () => {
    const features = extractFeatures(
      message({
        fromAddress: "no-reply@primevideo.com",
        fromDomain: "primevideo.com",
        fromDisplayName: "Prime Video",
        subject: "Nouveau film disponible sur Prime Video",
      }),
    );
    const result = classify(features, null);
    expect(result.verdict).toBe("LEGITIMATE");
  });
});
