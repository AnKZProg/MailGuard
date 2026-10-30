import { describe, expect, it } from "vitest";
import { extractFeatures, type ClassifiableMessage } from "@/lib/classify/features";
import { classify } from "@/lib/classify/score";
import { mentionsBrand } from "@/lib/classify/signals/identity";

// Fixtures modelled on scams that sat in a real inbox as LEGITIMATE before these rules.
function message(overrides: Partial<ClassifiableMessage>): ClassifiableMessage {
  return {
    fromAddress: "someone@example.org",
    fromDomain: "example.org",
    fromDisplayName: null,
    replyToDomain: null,
    subject: "Bonjour",
    snippet: null,
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

const verdictOf = (m: ClassifiableMessage, isFirstContact = true) => classify(extractFeatures(m, { isFirstContact }), null).verdict;

describe("mentionsBrand", () => {
  it("catches a brand written without its space or with a one-letter typo", () => {
    expect(mentionsBrand("Merci de continuer avec PrimeVideo", "prime video")).toBe(true);
    expect(mentionsBrand("Avis annuel primvideo", "prime video")).toBe(true);
  });

  it("matches short brands only as whole words", () => {
    expect(mentionsBrand("Votre colis DHL vous attend", "dhl")).toBe(true);
    expect(mentionsBrand("Un café à la cafétéria", "caf")).toBe(false);
    expect(mentionsBrand("Votre dossier CAF est prêt", "caf")).toBe(true);
  });
});

describe("scam rules", () => {
  it("a brand-named renewal notice from an unrelated domain is PHISHING", () => {
    expect(
      verdictOf(
        message({
          fromAddress: "luis@remoovit.example",
          fromDomain: "remoovit.example",
          fromDisplayName: "Avis annuel primvideo",
          subject: "Pécuniaire",
          snippet: "Avis de renouvellement · Prime Video · 69,90 €",
        }),
      ),
    ).toBe("PHISHING");
  });

  it("a parcel 'fee required' notice relayed through a third-party service is PHISHING", () => {
    expect(
      verdictOf(
        message({
          fromAddress: "prism@workorders.example",
          fromDomain: "workorders.example",
          replyToDomain: "elsewhere.example",
          subject: "VDR S has shared work order #W-58642 with you",
          snippet: "DHL EXPRESS · DELIVERY NOTICE Delivery fee required – $2.99",
        }),
      ),
    ).toBe("PHISHING");
  });

  it("a stranger opening with 'faire connaissance' is SPAM, a known correspondent is not", () => {
    const romance = message({ subject: "BONJOUR", snippet: "Je me permets de vous écrire pour faire connaissance." });
    expect(verdictOf(romance, true)).toBe("SPAM");
    expect(verdictOf(romance, false)).toBe("LEGITIMATE");
  });

  it("a provider notice mentioning WhatsApp is not a lure (bulk mail is exempt)", () => {
    expect(
      verdictOf(
        message({
          fromAddress: "noreply-accounts@google.com",
          fromDomain: "google.com",
          subject: "Vous avez partagé certaines données de votre compte Google avec WhatsApp",
          listUnsubscribe: "<mailto:unsub@google.com>",
        }),
      ),
    ).not.toBe("SPAM");
  });

  it("the real PayPal (paypal.fr) is not impersonating PayPal", () => {
    expect(
      verdictOf(
        message({
          fromAddress: "service@paypal.fr",
          fromDomain: "paypal.fr",
          subject: "Connexion depuis un nouvel appareil",
          snippet: "nous avons remarqué une nouvelle connexion à votre compte PayPal",
        }),
      ),
    ).toBe("LEGITIMATE");
  });
});
