import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";

export function authSignals(features: MessageFeatures): Signal[] {
  const signals: Signal[] = [];

  if (features.authDmarcFail) {
    signals.push({ ruleId: "auth.dmarc_fail", category: "phishing", weight: 0.3, detail: "Échec DMARC" });
  }
  if (features.authSpfFail && features.authDkimFail) {
    signals.push({
      ruleId: "auth.spf_dkim_fail",
      category: "phishing",
      weight: 0.25,
      detail: "Échec SPF et DKIM simultané",
    });
  } else if (features.authSpfFail) {
    signals.push({ ruleId: "auth.spf_fail", category: "spam", weight: 0.1, detail: "Échec SPF" });
  }
  if (features.replyToMismatch) {
    signals.push({
      ruleId: "auth.reply_to_mismatch",
      category: "phishing",
      weight: 0.2,
      detail: `Reply-To (${features.replyToDomain}) différent du domaine expéditeur (${features.fromDomain})`,
    });
  }

  return signals;
}
