"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { organizeBySenderAll } from "@/app/accounts/organize-actions";

export function OrganizeAllBySenderButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (
      !confirm(
        "Scanner toute la boîte de réception de chaque compte connecté (pas seulement les mails déjà synchronisés) et créer/réutiliser un dossier MailGuard > Marques par expéditeur récurrent (3+ mails) ? Peut prendre plusieurs minutes sur de grosses boîtes.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const summary = await organizeBySenderAll();
      const accountsFailedSuffix = summary.accountsFailed
        ? ` — ${summary.accountsFailed} compte(s) n'ont pas pu être traités du tout, voir les logs serveur`
        : "";
      if (summary.groups === 0) {
        toast[summary.accountsFailed ? "warning" : "info"](
          `Aucun expéditeur récurrent (3+ mails) trouvé sur les comptes traités.${accountsFailedSuffix}`,
        );
      } else {
        toast[summary.accountsFailed ? "warning" : "success"](
          `${summary.groups} dossier(s) (${summary.foldersReused} réutilisé(s), ${summary.foldersCreated} créé(s)), ${summary.moved} mail(s) rangé(s) sur ${summary.scanned} scanné(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}${accountsFailedSuffix}`,
        );
      }
    } catch {
      toast.error("Échec de la création des dossiers par marque");
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
      <FolderKanban className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
      Créer les dossiers par marque
    </button>
  );
}
