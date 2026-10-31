import { describe, expect, it } from "vitest";
import { assessAutoReply, htmlToText } from "@/lib/security/auto-reply";
import { googleVacationFinding, sendAsFindings } from "@/lib/security/google-audit";
import { microsoftAutoReplyFinding } from "@/lib/security/microsoft-audit";
import { describeFinding } from "@/lib/security/describe";

const ME = "me@gmail.com";
const NOW = Date.parse("2026-10-31T12:00:00Z");

describe("assessAutoReply", () => {
  it("leaves a plain out-of-office alone", () => {
    expect(assessAutoReply("Je suis absent jusqu'au 4 novembre, je vous réponds à mon retour.", [ME])).toBeNull();
  });

  it("flags a link, another mailbox and payment talk, keeping the first as target", () => {
    const result = assessAutoReply(
      "Nos coordonnées bancaires ont changé : https://pay.example.net/rib ou écrivez à compta@other.example",
      [ME],
    );
    expect(result?.target).toBe("pay.example.net");
    expect(result?.reasons).toEqual([
      "contient un lien",
      "renvoie vers compta@other.example",
      "parle de « coordonnées bancaires »",
    ]);
  });

  it("does not count the account's own address", () => {
    expect(assessAutoReply("Absent. Pour l'urgent : ME@gmail.com", [ME])).toBeNull();
  });
});

describe("htmlToText", () => {
  it("keeps link targets and drops markup and scripts", () => {
    expect(htmlToText('<p>Bonjour&nbsp;<a href="https://x.example/a">ici</a></p><script>alert(1)</script>')).toBe(
      "Bonjour https://x.example/a ici",
    );
  });
});

describe("sendAsFindings", () => {
  it("is quiet for a lone primary address", () => {
    expect(sendAsFindings([{ sendAsEmail: ME, isPrimary: true }], ME)).toEqual([]);
  });

  it("flags a reply-to on the primary address as critical", () => {
    const [finding] = sendAsFindings([{ sendAsEmail: ME, isPrimary: true, replyToAddress: "Thief@evil.example" }], ME);
    expect(finding).toMatchObject({ kind: "ALT_ADDRESS", severity: "CRITICAL", externalTarget: "thief@evil.example" });
  });

  it("lists an extra send-as address for confirmation", () => {
    const findings = sendAsFindings(
      [
        { sendAsEmail: ME, isPrimary: true },
        { sendAsEmail: "alias@work.example", verificationStatus: "accepted" },
      ],
      ME,
    );
    expect(findings).toEqual([expect.objectContaining({ severity: "INFO", externalTarget: "alias@work.example" })]);
  });
});

describe("googleVacationFinding", () => {
  const suspicious = { enableAutoReply: true, responseSubject: "Absent", responseBodyPlainText: "Nouveau RIB : voir www.rib-update.example" };

  it("flags an active auto-reply carrying payment instructions", () => {
    expect(googleVacationFinding(suspicious, [ME], NOW)).toMatchObject({ kind: "VACATION_SUSPICIOUS", severity: "WARNING" });
  });

  it("ignores a disabled or already-ended auto-reply", () => {
    expect(googleVacationFinding({ ...suspicious, enableAutoReply: false }, [ME], NOW)).toBeNull();
    expect(googleVacationFinding({ ...suspicious, endTime: String(NOW - 1000) }, [ME], NOW)).toBeNull();
  });

  it("reads the HTML body when there is no plain-text one", () => {
    const html = { enableAutoReply: true, responseBodyHtml: '<a href="https://evil.example">Mon compte</a>' };
    expect(googleVacationFinding(html, [ME], NOW)?.externalTarget).toBe("evil.example");
  });
});

describe("microsoftAutoReplyFinding", () => {
  const base = { externalReplyMessage: "<p>Virement à faire sur le nouveau compte</p>" };

  it("flags an always-on reply with payment talk", () => {
    expect(microsoftAutoReplyFinding({ ...base, status: "alwaysEnabled" }, ME, NOW)?.externalTarget).toBe("virement");
  });

  it("ignores disabled and finished scheduled replies (Graph's 7-digit fractions included)", () => {
    expect(microsoftAutoReplyFinding({ ...base, status: "disabled" }, ME, NOW)).toBeNull();
    const ended = { dateTime: "2026-10-30T08:00:00.0000000", timeZone: "UTC" };
    expect(microsoftAutoReplyFinding({ ...base, status: "scheduled", scheduledEndDateTime: ended }, ME, NOW)).toBeNull();
  });
});

describe("describeFinding", () => {
  it("says where replies are diverted", () => {
    const rawConfig = JSON.stringify({ reason: "reply_to", sendAsEmail: ME });
    expect(describeFinding({ kind: "ALT_ADDRESS", externalTarget: "thief@evil.example", rawConfig })).toBe(
      "les réponses à me@gmail.com partent vers thief@evil.example",
    );
  });

  it("lists the auto-reply reasons and survives a malformed config", () => {
    const rawConfig = JSON.stringify({ reasons: ["contient un lien"] });
    expect(describeFinding({ kind: "VACATION_SUSPICIOUS", externalTarget: "x.example", rawConfig })).toBe(
      "la réponse automatique contient un lien",
    );
    expect(describeFinding({ kind: "VACATION_SUSPICIOUS", externalTarget: null, rawConfig: "{oops" })).toBe(
      "réponse automatique active",
    );
  });

  it("keeps the forwarding wording for forward rules", () => {
    expect(describeFinding({ kind: "AUTO_FORWARD", externalTarget: "a@b.example", rawConfig: "{}" })).toBe(
      "transfère tes mails vers a@b.example",
    );
  });
});
