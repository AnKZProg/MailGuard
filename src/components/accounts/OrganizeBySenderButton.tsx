"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { organizeBySender } from "@/app/accounts/organize-actions";

export function OrganizeBySenderButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (
      !confirm(
        "Scanner toute la boîte de réception de ce compte (pas seulement les mails déjà synchronisés) et ranger les expéditeurs récurrents (3+ mails) dans un vrai dossier/libellé par marque, en réutilisant un dossier existant du même nom si tu en as déjà un ? Peut prendre plusieurs minutes sur une grosse boîte.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const summary = await organizeBySender(accountId);
      if (summary.groups === 0) {
        toast.info("Aucun expéditeur récurrent (3+ mails) trouvé pour l'instant.");
      } else {
        toast.success(
          `${summary.groups} dossier(s)/libellé(s) (${summary.foldersReused} réutilisé(s), ${summary.foldersCreated} créé(s)), ${summary.moved} mail(s) rangé(s) sur ${summary.scanned} scanné(s)${summary.failed ? `, ${summary.failed} échec(s)` : ""}`,
        );
      }
    } catch {
      toast.error("Échec de l'organisation par expéditeur");
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
      title="Organiser par expéditeur (toute la boîte de réception)"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-60"
    >
      <FolderKanban className={cn("h-3.5 w-3.5", busy && "animate-pulse")} strokeWidth={1.75} />
    </button>
  );
}
