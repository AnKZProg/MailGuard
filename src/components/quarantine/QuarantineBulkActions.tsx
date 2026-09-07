"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { purgeAllNow, blockAllQuarantinedSenders } from "@/app/quarantine/actions";
import { cn } from "@/lib/cn";

export function QuarantineBulkActions({ itemCount }: { itemCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"purge" | "block" | null>(null);

  if (itemCount === 0) return null;

  async function handlePurgeAll() {
    if (!confirm(`Supprimer définitivement les ${itemCount} message(s) en quarantaine (direction corbeille) ? Cette action est immédiate.`)) {
      return;
    }
    setBusy("purge");
    try {
      const summary = await purgeAllNow();
      toast.success(`${summary.purged} message(s) supprimé(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}`);
    } catch {
      toast.error("Échec de la suppression en masse");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  async function handleBlockAll() {
    setBusy("block");
    try {
      const summary = await blockAllQuarantinedSenders();
      toast.success(
        `${summary.blocked} expéditeur(s) bloqué(s) — leurs prochains mails seront automatiquement écartés par Gmail/Outlook.`,
      );
    } catch {
      toast.error("Échec du blocage en masse");
    } finally {
      setBusy(null);
      startTransition(() => router.refresh());
    }
  }

  const disabled = busy !== null || isPending;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleBlockAll}
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60"
      >
        <ShieldOff className={cn("h-3.5 w-3.5", busy === "block" && "animate-pulse")} strokeWidth={1.75} />
        Bloquer tous ces expéditeurs
      </button>
      <button
        type="button"
        onClick={handlePurgeAll}
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-verdict-phishing/40 px-3 text-[13px] font-medium text-verdict-phishing transition-colors hover:bg-verdict-phishing-soft disabled:opacity-60"
      >
        <Trash2 className={cn("h-3.5 w-3.5", busy === "purge" && "animate-pulse")} strokeWidth={1.75} />
        Tout supprimer
      </button>
    </div>
  );
}
