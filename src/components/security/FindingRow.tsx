import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { acknowledgeFinding } from "@/app/security/actions";
import type { SecurityFinding } from "@prisma/client";

const KIND_LABEL: Record<string, string> = {
  AUTO_FORWARD: "Transfert automatique (compte)",
  INBOX_RULE_FORWARD: "Règle de boîte de réception avec transfert",
  DELEGATE: "Délégation d'accès",
  ALT_ADDRESS: "Adresse alternative",
  IMAP_POP_ENABLED: "IMAP/POP activé",
  VACATION_SUSPICIOUS: "Réponse automatique suspecte",
};

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "border-verdict-phishing/30 bg-verdict-phishing-soft",
  WARNING: "border-verdict-newsletter/30 bg-verdict-newsletter-soft",
  INFO: "border-border-subtle bg-surface-1",
};

type Props = {
  finding: SecurityFinding & { account: { emailAddress: string } };
};

export function FindingRow({ finding }: Props) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", SEVERITY_STYLE[finding.severity])}>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text-primary">{KIND_LABEL[finding.kind] ?? finding.kind}</p>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          {finding.account.emailAddress}
          {finding.externalTarget ? ` → transfère vers ${finding.externalTarget}` : ""}
        </p>
        <p className="mt-1 text-[11px] text-text-tertiary">
          Détecté le {finding.firstSeenAt.toLocaleDateString("fr-FR")}
          {finding.acknowledgedAt ? " · pris en compte" : ""}
        </p>
      </div>
      {!finding.acknowledgedAt && (
        <form action={acknowledgeFinding.bind(null, finding.id)}>
          <button
            type="submit"
            className="flex h-7 items-center gap-1.5 rounded-md border border-border-default bg-surface-0 px-2.5 text-[12px] font-medium text-text-primary hover:bg-surface-2"
            title="C'est moi qui ai configuré ça"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
J&apos;ai configuré ça
          </button>
        </form>
      )}
    </div>
  );
}
