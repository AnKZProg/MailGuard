import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ShellStats } from "@/lib/queries/shell-stats";
import type { ThemePreference } from "@/lib/theme";
import { SyncButton } from "@/components/mail/SyncButton";
import { ShadowModeQuickToggle } from "./ShadowModeQuickToggle";
import { SidebarNav } from "./SidebarNav";
import { ProtectionSummary } from "./ProtectionSummary";
import { ThemeToggle } from "./ThemeToggle";
import { LastSync } from "./LastSync";

type Props = { stats: ShellStats; theme: ThemePreference };

export function Sidebar({ stats, theme }: Props) {
  const protectedNow = !stats.shadowMode;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border-subtle bg-surface-1">
      <div className="flex h-14 items-center gap-2 border-b border-border-subtle px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-contrast shadow-[var(--elevation-sm)]">
          <ShieldCheck className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-[14px] font-semibold tracking-tight text-text-primary">MailGuard</span>
        <span
          title={protectedNow ? "Le tri automatique est actif" : "Mode observation : rien n'est déplacé automatiquement"}
          className={cn(
            "ml-auto flex items-center gap-1.5 text-[11px] font-medium",
            protectedNow ? "text-verdict-legitimate" : "text-verdict-newsletter",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", protectedNow ? "bg-verdict-legitimate" : "bg-verdict-newsletter")} />
          {protectedNow ? "Tri auto" : "Observation"}
        </span>
      </div>

      <SidebarNav
        badges={{
          "/": { count: stats.unread, tone: "neutral" },
          "/quarantine": { count: stats.quarantined, tone: "neutral" },
          "/blocked": { count: stats.blocked, tone: "neutral" },
          "/security": { count: stats.criticalFindings, tone: "danger" },
          "/accounts": { count: stats.accountsNeedingAttention, tone: "warning" },
        }}
      />

      <div className="px-3 pt-2">
        <ProtectionSummary perDay={stats.interceptedPerDay} />
      </div>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border-subtle p-2">
        <SyncButton variant="sidebar" />
        <p className="px-2.5 pb-1 text-[11px] text-text-tertiary">
          <LastSync at={stats.lastSyncAt?.toISOString() ?? null} />
        </p>
        <ShadowModeQuickToggle enabled={stats.shadowMode} />

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-border-subtle px-1.5 pt-2">
          <span className="flex items-center gap-1 text-[11px] text-text-tertiary" title="Palette de commandes (Ctrl+K)">
            <kbd className="rounded border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            <kbd className="rounded border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[10px]">K</kbd>
          </span>
          <ThemeToggle initial={theme} />
        </div>
        <Link
          href="/privacy"
          className="px-2.5 pt-1.5 pb-1 text-[11px] text-text-tertiary underline decoration-border-default underline-offset-2 hover:text-text-secondary"
        >
          Local uniquement · Confidentialité
        </Link>
      </div>
    </aside>
  );
}
