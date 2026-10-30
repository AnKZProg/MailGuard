"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ShieldAlert, Archive, Users, Ban } from "lucide-react";
import { cn } from "@/lib/cn";

type Badge = { count: number; tone: "neutral" | "danger" | "warning" };

type Props = {
  badges: Partial<Record<"/" | "/quarantine" | "/blocked" | "/security" | "/accounts", Badge>>;
};

const NAV_ITEMS = [
  { href: "/", label: "Boîte unifiée", icon: Inbox },
  { href: "/quarantine", label: "Quarantaine", icon: Archive },
  { href: "/blocked", label: "Bloqués", icon: Ban },
  { href: "/security", label: "Sécurité", icon: ShieldAlert },
  { href: "/accounts", label: "Comptes", icon: Users },
] as const;

const compactCount = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

export function SidebarNav({ badges }: Props) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5 p-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        const badge = badges[href];
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
              isActive ? "bg-accent-soft text-accent-strong" : "text-text-secondary hover:bg-surface-2 hover:text-text-primary",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {label}
            {badge && badge.count > 0 && (
              <span
                className={cn(
                  "ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums",
                  badge.tone === "danger" && "bg-verdict-phishing text-white",
                  badge.tone === "warning" && "bg-verdict-newsletter-soft text-verdict-newsletter",
                  badge.tone === "neutral" && (isActive ? "text-accent-strong" : "text-text-tertiary"),
                )}
              >
                {compactCount.format(badge.count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
