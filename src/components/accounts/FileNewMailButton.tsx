"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderInput } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { fileNewMailAll } from "@/app/accounts/organize-actions";

export function FileNewMailButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const summary = await fileNewMailAll();
      if (summary.moved === 0) {
        toast.info("Rien de nouveau à ranger — aucun mail de la boîte de réception ne correspond à un dossier existant.");
      } else {
        toast.success(
          `${summary.moved} mail(s) rangé(s) dans un dossier existant sur ${summary.scanned} scanné(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}`,
        );
      }
    } catch {
      toast.error("Échec du rangement des nouveaux mails");
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
      <FolderInput className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
      Ranger les nouveaux mails
    </button>
  );
}
