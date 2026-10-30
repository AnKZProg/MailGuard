import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

/** Sidebar card: mail intercepted over the last 7 days, with a quiet sparkline of the same window. */
export function ProtectionSummary({ perDay }: { perDay: number[] }) {
  const total = perDay.reduce((sum, n) => sum + n, 0);
  const max = Math.max(1, ...perDay);
  const hasActivity = total > 0;

  return (
    <Link
      href="/quarantine"
      className="group block rounded-lg border border-border-subtle bg-surface-0 px-3 py-2.5 transition-colors hover:border-border-default"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        <ShieldCheck className="h-3 w-3" strokeWidth={2} />
        7 derniers jours
      </div>
      <p className="mt-1 text-[13px] text-text-secondary">
        <span className={cn("text-[18px] font-semibold tabular-nums tracking-tight", hasActivity ? "text-text-primary" : "text-text-tertiary")}>
          {total.toLocaleString("fr-FR")}
        </span>{" "}
        {total > 1 ? "mails mis à l'abri" : "mail mis à l'abri"}
      </p>
      {hasActivity && (
        <div className="mt-2 flex h-6 items-end gap-0.5" aria-hidden>
          {perDay.map((count, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-sm",
                count > 0 ? "bg-accent/60 group-hover:bg-accent" : "bg-surface-2",
              )}
              style={{ height: `${Math.max(12, (count / max) * 100)}%` }}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
