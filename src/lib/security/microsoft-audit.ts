import type { RawFinding } from "@/lib/security/findings";
import { assessAutoReply, htmlToText } from "@/lib/security/auto-reply";
import { getAutomaticReplies, listInboxRules, type AutomaticRepliesSetting } from "@/lib/providers/microsoft/graph-client";

export const MICROSOFT_AUDIT_KINDS = ["INBOX_RULE_FORWARD", "VACATION_SUSPICIOUS"] as const;

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
 * Covers inbox rules and automatic replies — Graph has no equivalent of
 * "account-level auto-forward", delegates or aliases for personal Microsoft
 * accounts (those are Exchange Online / admin-managed concepts, invisible to
 * this delegated-permission scan). Documented in docs/setup-azure.md so the gap
 * isn't silently assumed away.
 */
export async function auditMicrosoftAccount(accessToken: string, ownAddress: string): Promise<RawFinding[]> {
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

  const vacationFinding = microsoftAutoReplyFinding(await getAutomaticReplies(accessToken), ownAddress);
  if (vacationFinding) findings.push(vacationFinding);

  return findings;
}

export function microsoftAutoReplyFinding(setting: AutomaticRepliesSetting, ownAddress: string, now = Date.now()): RawFinding | null {
  if (setting.status === "disabled") return null;
  // Graph returns schedule times as UTC unless the mailbox asked otherwise; hours of skew only delay auto-resolution.
  const end = setting.scheduledEndDateTime;
  if (setting.status === "scheduled" && end && Date.parse(`${end.dateTime}Z`) < now) return null;
  const text = `${htmlToText(setting.externalReplyMessage ?? "")} ${htmlToText(setting.internalReplyMessage ?? "")}`;
  const assessment = assessAutoReply(text, [ownAddress]);
  if (!assessment) return null;
  return {
    kind: "VACATION_SUSPICIOUS",
    severity: "WARNING",
    externalTarget: assessment.target,
    rawConfig: { reasons: assessment.reasons, status: setting.status, externalAudience: setting.externalAudience },
  };
}
