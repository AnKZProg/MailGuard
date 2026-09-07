import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";

/** The provider's own spam filter is a strong, free signal — Gmail/Outlook see far more mail than we do. */
export function providerSignals(features: MessageFeatures): Signal[] {
  if (!features.providerSpamFlag) return [];
  return [
    {
      ruleId: "provider.spam_flag",
      category: "spam",
      weight: 0.65,
      detail: "Déjà classé comme indésirable par Gmail/Outlook",
    },
  ];
}
