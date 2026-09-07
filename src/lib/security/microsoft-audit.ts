import type { RawFinding } from "@/lib/security/findings";
import { listInboxRules } from "@/lib/providers/microsoft/graph-client";

export const MICROSOFT_AUDIT_KINDS = ["INBOX_RULE_FORWARD"] as const;

type RuleActions = {
  forwardTo?: { emailAddress?: { address?: string } }[];
  redirectTo?: { emailAddress?: { address?: string } }[];
  forwardAsAttachmentTo?: { emailAddress?: { address?: string } }[];
};

function firstTarget(actions: RuleActions): string | undefined {
  const recipient = actions.forwardTo?.[0] ?? actions.redirectTo?.[0] ?? actions.forwardAsAttachmentTo?.[0];
  return recipient?.emailAddress?.address;
}

/**
 * Covers inbox rules only — Graph has no equivalent of "account-level auto-forward"
 * for personal Microsoft accounts (that's an Exchange Online / admin-managed
 * concept, invisible to this delegated-permission scan). Documented in
 * docs/setup-azure.md so the gap isn't silently assumed away.
 */
export async function auditMicrosoftAccount(accessToken: string): Promise<RawFinding[]> {
  const rules = await listInboxRules(accessToken);
  const findings: RawFinding[] = [];

  for (const rule of rules) {
    const actions = (rule.actions ?? {}) as RuleActions;
    const target = firstTarget(actions);
    if (target) {
      findings.push({
        kind: "INBOX_RULE_FORWARD",
        severity: "CRITICAL",
        externalTarget: target,
        rawConfig: rule,
      });
    }
  }

  return findings;
}
