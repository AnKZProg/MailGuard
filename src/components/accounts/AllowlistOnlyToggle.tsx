import { ListChecks } from "lucide-react";
import { toggleAllowlistOnly } from "@/app/accounts/actions";
import { formatDateTime } from "@/lib/format/mail-date";
import { cn } from "@/lib/cn";

type AllowlistOnlyToggleProps = {
  accountId: string;
  /** When the mode was turned on for this box, or null if it's off. */
  since: Date | null;
};

/** Per-box "only known senders" switch (see lib/classify/allowlist-only.ts). */
export function AllowlistOnlyToggle({ accountId, since }: AllowlistOnlyToggleProps) {
  const enabled = since !== null;
  const title = enabled
    ? `Liste blanche active depuis le ${formatDateTime(since)} : tout expéditeur inconnu part en quarantaine (récupérable). Clique pour la désactiver.`
    : "Activer la liste blanche : seuls les expéditeurs autorisés ou que tu as confirmés comme légitimes arrivent ; le reste part en quarantaine (récupérable). Ne s'applique qu'aux nouveaux mails.";
  return (
    <form action={toggleAllowlistOnly}>
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        title={title}
        aria-pressed={enabled}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
          enabled
            ? "border-verdict-legitimate bg-verdict-legitimate/10 text-verdict-legitimate hover:bg-verdict-legitimate/20"
            : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2",
        )}
      >
        <ListChecks className="h-3.5 w-3.5" strokeWidth={1.75} />
        {enabled ? "Liste blanche" : "Liste blanche : off"}
      </button>
    </form>
  );
}
