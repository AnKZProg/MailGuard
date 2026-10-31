import type { Verdict } from "@prisma/client";
import { cn } from "@/lib/cn";
import { correctVerdictAction } from "@/app/actions/message-actions";

const OPTIONS: { verdict: Verdict; label: string; activeClass: string }[] = [
  { verdict: "LEGITIMATE", label: "Légitime", activeClass: "bg-verdict-legitimate-soft text-verdict-legitimate" },
  { verdict: "NEWSLETTER", label: "Newsletter", activeClass: "bg-verdict-newsletter-soft text-verdict-newsletter" },
  { verdict: "SPAM", label: "Spam", activeClass: "bg-verdict-spam-soft text-verdict-spam" },
  { verdict: "PHISHING", label: "Phishing", activeClass: "bg-verdict-phishing-soft text-verdict-phishing" },
];

type Props = { messageId: string; current: Verdict | null; confirmedByUser: boolean };

export function VerdictCorrection({ messageId, current, confirmedByUser }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="whitespace-nowrap text-[12px] text-text-tertiary" title="MailGuard apprend de chaque correction, en local">
        {confirmedByUser ? "Verdict confirmé :" : "Verdict — clique pour corriger :"}
      </span>
      <div role="group" aria-label="Corriger le verdict" className="flex items-center gap-0.5 rounded-md border border-border-subtle bg-surface-0 p-0.5">
        {OPTIONS.map((option) => {
          const active = option.verdict === current;
          return (
            <form key={option.verdict} action={correctVerdictAction.bind(null, messageId, option.verdict)}>
              <button
                type="submit"
                disabled={active && confirmedByUser}
                aria-pressed={active}
                className={cn(
                  "h-6 rounded px-2 text-[11.5px] font-medium transition-colors disabled:cursor-default",
                  active ? option.activeClass : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                )}
              >
                {option.label}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
