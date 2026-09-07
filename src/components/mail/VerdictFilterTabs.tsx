import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Verdict } from "@prisma/client";

const TABS: { label: string; verdict: Verdict | undefined }[] = [
  { label: "Tous", verdict: undefined },
  { label: "Légitimes", verdict: "LEGITIMATE" },
  { label: "Newsletters", verdict: "NEWSLETTER" },
  { label: "Spam", verdict: "SPAM" },
  { label: "Phishing", verdict: "PHISHING" },
];

export function VerdictFilterTabs({ active }: { active?: Verdict }) {
  return (
    <nav className="flex items-center gap-1">
      {TABS.map(({ label, verdict }) => {
        const isActive = active === verdict;
        return (
          <Link
            key={label}
            href={{ pathname: "/", query: verdict ? { verdict } : {} }}
            className={cn(
              "flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium transition-colors",
              isActive ? "bg-accent-soft text-accent-strong" : "text-text-secondary hover:bg-surface-2",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
