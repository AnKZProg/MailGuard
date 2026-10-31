import type { RawFinding } from "@/lib/security/findings";
import { assessAutoReply, htmlToText } from "@/lib/security/auto-reply";
import {
  getAutoForwarding,
  listFilters,
  getImapSettings,
  getPopSettings,
  getVacationSettings,
  listSendAs,
  type SendAs,
  type VacationSettings,
} from "@/lib/providers/google/gmail-settings-client";

export const GOOGLE_AUDIT_KINDS = [
  "AUTO_FORWARD",
  "INBOX_RULE_FORWARD",
  "IMAP_POP_ENABLED",
  "ALT_ADDRESS",
  "VACATION_SUSPICIOUS",
] as const;

/**
 * Classic account-takeover persistence: an attacker with brief access sets up
 * silent forwarding so they keep reading mail after the password is changed.
 * We flag every active forward, whether Gmail's account-level auto-forward or a
 * filter with a forward action — there's no way to tell "the user did this
 * intentionally" apart from "an attacker did" without asking, so both surface.
 *
 * Delegated access ("Grant access to your account") can't be checked: Gmail's
 * delegates API only answers service accounts with Workspace domain-wide
 * authority, never a personal account's own OAuth token.
 */
/** `ownAddresses`: this account first, then every other mailbox connected to MailGuard — replies routed there are the user's own. */
export async function auditGoogleAccount(accessToken: string, ownAddresses: string[]): Promise<RawFinding[]> {
  const findings: RawFinding[] = [];

  const autoForwarding = await getAutoForwarding(accessToken);
  if (autoForwarding?.enabled && autoForwarding.emailAddress) {
    findings.push({
      kind: "AUTO_FORWARD",
      severity: "CRITICAL",
      externalTarget: autoForwarding.emailAddress,
      rawConfig: autoForwarding,
    });
  }

  const filters = await listFilters(accessToken);
  for (const filter of filters) {
    const forwardTo = filter.action?.forward;
    if (forwardTo) {
      findings.push({
        kind: "INBOX_RULE_FORWARD",
        severity: "CRITICAL",
        externalTarget: forwardTo,
        rawConfig: filter,
      });
    }
  }

  const imap = await getImapSettings(accessToken);
  const pop = await getPopSettings(accessToken);
  if (imap?.enabled || (pop && pop.accessWindow !== "disabled")) {
    findings.push({
      kind: "IMAP_POP_ENABLED",
      severity: "INFO",
      externalTarget: null,
      rawConfig: { imap, pop },
    });
  }

  const sendAs = await listSendAs(accessToken);
  findings.push(...sendAsFindings(sendAs, ownAddresses));

  const vacation = await getVacationSettings(accessToken);
  const vacationFinding = vacation ? googleVacationFinding(vacation, [...ownAddresses, ...sendAs.map((s) => s.sendAsEmail)]) : null;
  if (vacationFinding) findings.push(vacationFinding);

  return findings;
}

/**
 * A "reply-to" on the main address quietly sends every answer to someone else —
 * the correspondent sees the real sender and never notices. Extra send-as
 * addresses are listed so the user can confirm they're theirs.
 */
export function sendAsFindings(entries: SendAs[], ownAddresses: string[]): RawFinding[] {
  const own = new Set(ownAddresses.map((a) => a.toLowerCase()));
  const findings: RawFinding[] = [];
  for (const entry of entries) {
    const replyTo = entry.replyToAddress?.trim().toLowerCase();
    if (replyTo && replyTo !== entry.sendAsEmail.toLowerCase() && !own.has(replyTo)) {
      findings.push({
        kind: "ALT_ADDRESS",
        severity: entry.isPrimary ? "CRITICAL" : "WARNING",
        externalTarget: replyTo,
        rawConfig: { reason: "reply_to", sendAsEmail: entry.sendAsEmail, replyToAddress: entry.replyToAddress },
      });
    }
    if (!entry.isPrimary && !own.has(entry.sendAsEmail.toLowerCase())) {
      findings.push({
        kind: "ALT_ADDRESS",
        severity: "INFO",
        externalTarget: entry.sendAsEmail,
        rawConfig: { reason: "send_as", sendAsEmail: entry.sendAsEmail, verificationStatus: entry.verificationStatus },
      });
    }
  }
  return findings;
}

export function googleVacationFinding(vacation: VacationSettings, ownAddresses: string[], now = Date.now()): RawFinding | null {
  if (!vacation.enableAutoReply) return null;
  if (vacation.endTime && Number(vacation.endTime) < now) return null;
  const body = vacation.responseBodyPlainText ?? htmlToText(vacation.responseBodyHtml ?? "");
  const assessment = assessAutoReply(`${vacation.responseSubject ?? ""} ${body}`, ownAddresses);
  if (!assessment) return null;
  return {
    kind: "VACATION_SUSPICIOUS",
    severity: "WARNING",
    externalTarget: assessment.target,
    rawConfig: { reasons: assessment.reasons, responseSubject: vacation.responseSubject },
  };
}
