"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ShieldAlert, Archive, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { SyncButton } from "@/components/mail/SyncButton";
import { ShadowModeQuickToggle } from "./ShadowModeQuickToggle";

const NAV_ITEMS = [
  { href: "/", label: "Boîte unifiée", icon: Inbox },
  { href: "/quarantine", label: "Quarantaine", icon: Archive },
  { href: "/security", label: "Sécurité", icon: ShieldAlert },
  { href: "/accounts", label: "Comptes", icon: Users },
] as const;

type Props = {
  criticalFindingsCount?: number;
  shadowModeEnabled?: boolean;
};

export function Sidebar({ criticalFindingsCount = 0, shadowModeEnabled = true }: Props) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border-subtle bg-surface-1">
      <div className="flex h-14 items-center gap-2 border-b border-border-subtle px-4">
        <ShieldCheck className="h-[18px] w-[18px] text-accent" strokeWidth={1.5} />
        <span className="text-[13px] font-semibold tracking-tight text-text-primary">MailGuard</span>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent-strong"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {label}
              {href === "/security" && criticalFindingsCount > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-verdict-phishing px-1 text-[10px] font-semibold text-white">
                  {criticalFindingsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border-subtle p-2">
        <SyncButton variant="sidebar" />
        <ShadowModeQuickToggle enabled={shadowModeEnabled} />

        <div className="mt-1 flex items-center gap-1.5 border-t border-border-subtle px-2.5 pt-2 text-[11px] text-text-tertiary">
          <kbd className="rounded border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
          <kbd className="rounded border border-border-default bg-surface-2 px-1 py-0.5 font-mono text-[10px]">K</kbd>
          <span>palette de commandes</span>
        </div>
        <p className="px-2.5 pt-1 text-[11px] text-text-tertiary">Usage local — rien ne quitte cette machine.</p>
        <Link
          href="/privacy"
          className="px-2.5 pb-1 text-[11px] text-text-tertiary underline decoration-border-default underline-offset-2 hover:text-text-secondary"
        >
          Confidentialité &amp; conditions
        </Link>
      </div>
    </aside>
  );
}
