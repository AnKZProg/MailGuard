import { cn } from "@/lib/cn";
import type { Verdict } from "@prisma/client";

const STYLE: Record<Verdict, { label: string; className: string }> = {
  LEGITIMATE: { label: "Légitime", className: "bg-verdict-legitimate-soft text-verdict-legitimate" },
  NEWSLETTER: { label: "Newsletter", className: "bg-verdict-newsletter-soft text-verdict-newsletter" },
  SPAM: { label: "Spam", className: "bg-verdict-spam-soft text-verdict-spam" },
  PHISHING: { label: "Phishing", className: "bg-verdict-phishing-soft text-verdict-phishing" },
};

type Props = {
  verdict: Verdict | null;
};

export function VerdictBadge({ verdict }: Props) {
  if (!verdict) {
    return (
      <span className="inline-flex h-5 items-center rounded-full bg-surface-2 px-2 text-[11px] font-medium text-text-tertiary">
        En attente
      </span>
    );
  }
  const { label, className } = STYLE[verdict];
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-medium", className)}>
      {label}
    </span>
  );
}
