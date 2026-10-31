"use client";

import { useTransition } from "react";
import { DatabaseBackup } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { backupNowAction } from "@/app/accounts/backup-actions";

export function BackupNowButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const { ok } = await backupNowAction();
      if (ok) toast.success("Sauvegarde faite");
      else toast.error("La sauvegarde a échoué — rien n'a été modifié.");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2 disabled:opacity-60"
    >
      <DatabaseBackup className={cn("h-3.5 w-3.5", isPending && "animate-pulse")} strokeWidth={1.75} />
      Sauvegarder maintenant
    </button>
  );
}
