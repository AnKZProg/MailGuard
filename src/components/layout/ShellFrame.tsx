"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  sidebar: ReactNode;
  children: ReactNode;
};

/**
 * Desktop: sidebar and page side by side. Below `md` the sidebar becomes an
 * off-canvas drawer opened from a slim top bar, so the page keeps the full
 * phone width. The sidebar itself stays a server component passed in as a slot.
 */
export function ShellFrame({ sidebar, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Following a link inside the drawer should land on the page, not leave the drawer over it.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    drawerRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-0 text-text-primary md:flex-row">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-1 px-2 md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="app-sidebar"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
        </button>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-contrast">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-[14px] font-semibold tracking-tight">MailGuard</span>
      </div>

      {open && (
        <div aria-hidden className="animate-fade-in fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div
        id="app-sidebar"
        ref={drawerRef}
        tabIndex={-1}
        data-open={open || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex shadow-[var(--elevation-lg)] outline-none transition-[translate,visibility] duration-200 ease-out",
          "md:static md:z-auto md:translate-x-0 md:shadow-none md:visible",
          open ? "translate-x-0" : "invisible -translate-x-full",
        )}
      >
        {sidebar}
      </div>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
