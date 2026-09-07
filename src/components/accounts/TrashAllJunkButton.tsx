"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { trashAllJunkNow } from "@/app/actions/junk-actions";

export function TrashAllJunkButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!confirm("Mettre à la corbeille tout le courrier classé Spam ou Phishing actuellement dans la boîte de réception, sur tous les comptes ?")) {
      return;
    }
    setBusy(true);
    try {
      const summary = await trashAllJunkNow();
      if (summary.trashed === 0 && summary.failed === 0) {
        toast.info("Rien à supprimer — aucun courrier indésirable en attente.");
      } else {
        toast.success(`${summary.trashed} mail(s) supprimé(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}`);
      }
    } catch {
      toast.error("Échec de la suppression");
    } finally {
      setBusy(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || isPending}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-verdict-phishing/40 px-3 text-[13px] font-medium text-verdict-phishing transition-colors hover:bg-verdict-phishing-soft disabled:opacity-60"
    >
      <Trash2 className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
      Supprimer le courrier indésirable
    </button>
  );
}
