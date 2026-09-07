"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { trashAllNewsletters } from "@/app/actions/newsletter-actions";

export function TrashAllNewslettersButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!confirm("Mettre à la corbeille toutes les newsletters actuellement listées ici ? Elles restent récupérables depuis la corbeille de chaque compte.")) {
      return;
    }
    setBusy(true);
    try {
      const summary = await trashAllNewsletters();
      if (summary.trashed === 0 && summary.failed === 0) {
        toast.info("Aucune newsletter à supprimer ici.");
      } else {
        toast.success(`${summary.trashed} newsletter(s) supprimée(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}`);
      }
    } catch {
      toast.error("Échec de la suppression en masse");
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
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-verdict-phishing/40 px-3 text-[13px] font-medium text-verdict-phishing transition-colors hover:bg-verdict-phishing-soft disabled:opacity-60"
    >
      <Trash2 className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
      Tout supprimer
    </button>
  );
}
