"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

export function SyncButton({ variant = "header" }: { variant?: "header" | "sidebar" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const busy = isPending || isSyncing;

  async function handleClick() {
    setIsSyncing(true);
    const promise = fetch("/api/sync", { method: "POST" }).then(async (res) => {
      if (!res.ok) throw new Error("sync_failed");
      return (await res.json()) as { synced: number; failed: number };
    });

    toast.promise(promise, {
      loading: "Synchronisation en cours...",
      success: (data) => `${data.synced} compte(s) synchronisé(s)${data.failed ? `, ${data.failed} échec(s)` : ""}`,
      error: "Échec de la synchronisation — vérifie les identifiants dans .env.local",
    });

    try {
      await promise;
    } catch {
      // toast already reported the error
    } finally {
      setIsSyncing(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60",
        variant === "header"
          ? "gap-1.5 border border-border-default px-3 text-[13px]"
          : "w-full px-2.5 text-[12px] text-text-secondary hover:text-text-primary",
      )}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} strokeWidth={1.75} />
      Synchroniser
    </button>
  );
}
