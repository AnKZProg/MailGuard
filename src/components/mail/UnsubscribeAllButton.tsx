"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MailX } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { unsubscribeAllNewsletters } from "@/app/actions/newsletter-actions";

export function UnsubscribeAllButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const summary = await unsubscribeAllNewsletters();
      if (summary.attempted === 0) {
        toast.info("Aucune newsletter avec lien de désabonnement trouvée ici.");
      } else {
        const parts = [`${summary.success} réussi(s)`];
        if (summary.unsupported) parts.push(`${summary.unsupported} nécessitent un e-mail (non automatisable)`);
        if (summary.failed) parts.push(`${summary.failed} échec(s)`);
        toast.success(`Désabonnement : ${parts.join(", ")}`);
      }
    } catch {
      toast.error("Échec du désabonnement en masse");
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
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      <MailX className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
      Se désabonner de tout
    </button>
  );
}
