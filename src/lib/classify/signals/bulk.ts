import type { MessageFeatures } from "@/lib/classify/features";
import type { Signal } from "@/lib/classify/signal";

export function bulkSignals(features: MessageFeatures): Signal[] {
  if (!features.isBulk) return [];
  return [
    {
      ruleId: "bulk.list_headers",
      category: "newsletter",
      weight: 0.6,
      detail: "En-têtes List-Unsubscribe/List-Id/Precedence présents",
    },
  ];
}
