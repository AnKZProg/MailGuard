import { cn } from "@/lib/cn";
import type { MessageSignal } from "@prisma/client";

const CATEGORY_STYLE: Record<string, string> = {
  phishing: "text-verdict-phishing",
  spam: "text-verdict-spam",
  newsletter: "text-verdict-newsletter",
  security: "text-verdict-phishing",
};

type Props = {
  signals: MessageSignal[];
};

export function SignalExplainer({ signals }: Props) {
  if (signals.length === 0) {
    return <p className="text-[12px] text-text-tertiary">Aucun signal détecté.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {signals.map((signal) => (
        <li key={signal.id} className="flex items-start justify-between gap-2 text-[12px]">
          <span className="text-text-secondary">{signal.detail}</span>
          {signal.weight > 0 && (
            <span className={cn("shrink-0 tabular-nums", CATEGORY_STYLE[signal.label] ?? "text-text-tertiary")}>
              +{signal.weight.toFixed(2)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
