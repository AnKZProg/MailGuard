"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Inbox, Archive, ShieldAlert, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PAGES = [
  { label: "Boîte unifiée", href: "/", icon: Inbox },
  { label: "Quarantaine", href: "/quarantine", icon: Archive },
  { label: "Sécurité", href: "/security", icon: ShieldAlert },
  { label: "Comptes", href: "/accounts", icon: Users },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const runSync = useCallback(async () => {
    setOpen(false);
    const promise = fetch("/api/sync", { method: "POST" }).then(async (res) => {
      if (!res.ok) throw new Error("sync_failed");
      const data = (await res.json()) as { synced: number; failed: number };
      router.refresh();
      return data;
    });
    toast.promise(promise, {
      loading: "Synchronisation en cours...",
      success: (data) => `${data.synced} compte(s) synchronisé(s)${data.failed ? `, ${data.failed} échec(s)` : ""}`,
      error: "Échec de la synchronisation",
    });
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <Command
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in w-full max-w-md overflow-hidden rounded-lg border border-border-default bg-surface-1 shadow-2xl"
        label="Palette de commandes"
      >
        <Command.Input
          autoFocus
          placeholder="Aller à... ou lancer une action"
          className="w-full border-b border-border-subtle bg-transparent px-4 py-3 text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
        />
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-[13px] text-text-tertiary">Aucun résultat.</Command.Empty>
          <Command.Group heading="Action" className="px-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-tertiary [&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-1.5">
            <Command.Item
              onSelect={runSync}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-text-primary aria-selected:bg-accent-soft aria-selected:text-accent-strong"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
              Synchroniser maintenant
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Navigation" className="px-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-text-tertiary [&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-1.5">
            {PAGES.map(({ label, href, icon: Icon }) => (
              <Command.Item
                key={href}
                onSelect={() => {
                  setOpen(false);
                  router.push(href);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-text-primary aria-selected:bg-accent-soft aria-selected:text-accent-strong"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
