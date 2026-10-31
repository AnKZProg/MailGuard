import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Verdict } from "@prisma/client";
import { inboxHref, type InboxQuery } from "@/lib/queries/inbox-url";

const TABS: { label: string; verdict: Verdict | undefined }[] = [
  { label: "Tous", verdict: undefined },
  { label: "Légitimes", verdict: "LEGITIMATE" },
  { label: "Newsletters", verdict: "NEWSLETTER" },
  { label: "Spam", verdict: "SPAM" },
  { label: "Phishing", verdict: "PHISHING" },
];

type Props = {
  query: InboxQuery;
  /** Inbox count per verdict; omitted while a search is active (counts would not match the results). */
  counts?: Partial<Record<Verdict | "ALL", number>>;
};

export function VerdictFilterTabs({ query, counts }: Props) {
  return (
    <nav aria-label="Filtrer par verdict" className="flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
      {TABS.map(({ label, verdict }) => {
        const isActive = query.verdict === verdict;
        const count = counts?.[verdict ?? "ALL"];
        return (
          <Link
            key={label}
            href={inboxHref({ ...query, verdict })}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors",
              isActive ? "bg-accent-soft text-accent-strong" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={cn("tabular-nums text-[11px]", isActive ? "text-accent-strong/80" : "text-text-tertiary")}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
