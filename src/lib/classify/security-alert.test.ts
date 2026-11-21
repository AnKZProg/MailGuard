import { describe, expect, it } from "vitest";
import { extractFeatures, type ClassifiableMessage } from "@/lib/classify/features";
import { classify } from "@/lib/classify/score";
import { detectSecurityAlert, keepSecurityAlert, SECURITY_ALERT_RULE_ID } from "@/lib/classify/security-alert";

function message(overrides: Partial<ClassifiableMessage> = {}): ClassifiableMessage {
  return {
    fromAddress: "noreply@steampowered.com",
    fromDomain: "steampowered.com",
    fromDisplayName: "Steam",
    replyToDomain: null,
    subject: "Votre compte Steam : accès depuis un nouvel appareil",
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

const detect = (overrides: Partial<ClassifiableMessage> = {}) => detectSecurityAlert(extractFeatures(message(overrides)));

describe("detectSecurityAlert", () => {
  it("recognises authenticated Steam and Discord security notices (FR + EN)", () => {
    expect(detect()).toBe("Steam");
    expect(detect({ subject: "Votre code Steam Guard" })).toBe("Steam");
    expect(detect({ subject: "Récupération de compte Steam" })).toBe("Steam");
    expect(
      detect({ fromAddress: "noreply@discord.com", fromDomain: "discord.com", subject: "Verify Discord Login from New Location" }),
    ).toBe("Discord");
    expect(
      detect({ fromAddress: "noreply@discord.com", fromDomain: "discord.com", subject: "Ton mot de passe Discord a été modifié" }),
    ).toBe("Discord");
  });

  it("ignores ordinary Steam mail such as wishlist sales", () => {
    expect(detect({ subject: "Valheim (dans votre liste de souhaits Steam) est en promotion !" })).toBeNull();
    expect(detect({ subject: "Votre échange Steam récent" })).toBeNull();
  });

  it("ignores bulk mail even from the right domain", () => {
    expect(detect({ subject: "Protégez votre mot de passe", listUnsubscribe: "<mailto:x@steampowered.com>" })).toBeNull();
  });

  it("never trusts a spoofed or unauthenticated sender", () => {
    expect(detect({ authDkim: "fail", authDmarc: "fail" })).toBeNull();
    expect(detect({ authDkim: null, authDmarc: null })).toBeNull();
    expect(detect({ authDmarc: "fail" })).toBeNull();
    expect(detect({ fromDomain: "steampowered.com.evil.ru", fromAddress: "x@steampowered.com.evil.ru" })).toBeNull();
    expect(detect({ fromDomain: "steamcommunlty.com", fromAddress: "x@steamcommunlty.com" })).toBeNull();
  });
});

describe("keepSecurityAlert", () => {
  it("overrides a junk verdict and explains why", () => {
    const junk = { verdict: "SPAM" as const, score: 1, signals: [], shouldQuarantine: true };
    const kept = keepSecurityAlert(junk, "Steam");
    expect(kept.verdict).toBe("LEGITIMATE");
    expect(kept.shouldQuarantine).toBe(false);
    expect(kept.signals.map((s) => s.ruleId)).toContain(SECURITY_ALERT_RULE_ID);
  });
});

describe("Steam/Discord impersonation", () => {
  it("flags a lookalike domain posing as Steam", () => {
    const features = extractFeatures(
      message({ fromAddress: "support@steamcommunlty.com", fromDomain: "steamcommunlty.com", authDkim: null, authDmarc: null }),
    );
    const ids = classify(features, null).signals.map((s) => s.ruleId);
    expect(ids).toContain("identity.lookalike_domain");
    expect(ids).toContain("identity.display_name_impersonation");
  });

  it("does not flag a game store naming Steam in its subject", () => {
    const features = extractFeatures(
      message({
        fromAddress: "orders@instant-gaming.com",
        fromDomain: "instant-gaming.com",
        fromDisplayName: "Instant Gaming",
        subject: "Votre clé Steam est prête",
        snippet: "Activez votre clé Steam dans le client",
      }),
    );
    const ids = classify(features, null).signals.map((s) => s.ruleId);
    expect(ids.filter((id) => id.startsWith("identity."))).toEqual([]);
  });
});
