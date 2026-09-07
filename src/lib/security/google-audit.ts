import type { RawFinding } from "@/lib/security/findings";
import {
  getAutoForwarding,
  listFilters,
  getImapSettings,
  getPopSettings,
} from "@/lib/providers/google/gmail-settings-client";

export const GOOGLE_AUDIT_KINDS = ["AUTO_FORWARD", "INBOX_RULE_FORWARD", "IMAP_POP_ENABLED"] as const;

/**
 * Classic account-takeover persistence: an attacker with brief access sets up
 * silent forwarding so they keep reading mail after the password is changed.
 * We flag every active forward, whether Gmail's account-level auto-forward or a
 * filter with a forward action — there's no way to tell "the user did this
 * intentionally" apart from "an attacker did" without asking, so both surface.
 */
export async function auditGoogleAccount(accessToken: string): Promise<RawFinding[]> {
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

  return findings;
}
