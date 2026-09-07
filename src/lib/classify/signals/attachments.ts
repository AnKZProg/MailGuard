import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";
import { RISKY_ATTACHMENT_EXTENSIONS } from "@/lib/classify/config";

export function attachmentSignals(features: MessageFeatures): Signal[] {
  if (!features.hasAttachments) return [];
  const risky = features.attachmentTypes.find((ext) => RISKY_ATTACHMENT_EXTENSIONS.includes(ext));
  if (!risky) return [];
  return [
    {
      ruleId: "attachments.risky_extension",
      category: "phishing",
      weight: 0.3,
      detail: `Pièce jointe exécutable (.${risky})`,
    },
  ];
}
