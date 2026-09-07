import { ShieldAlert, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { FindingRow } from "@/components/security/FindingRow";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const accountCount = await db.account.count();
  const findings = await db.securityFinding.findMany({
    where: { resolvedAt: null },
    include: { account: { select: { emailAddress: true } } },
    orderBy: [{ severity: "asc" }, { firstSeenAt: "desc" }],
  });

  const unacknowledgedCritical = findings.filter((f) => f.severity === "CRITICAL" && !f.acknowledgedAt);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center border-b border-border-subtle px-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Sécurité</h1>
      </header>

      {unacknowledgedCritical.length > 0 && (
        <div className="flex items-center gap-2.5 border-b border-verdict-phishing/30 bg-verdict-phishing-soft px-6 py-3 text-[13px] text-verdict-phishing">
          <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {unacknowledgedCritical.length === 1
            ? "1 règle de transfert suspecte détectée — vérifie si tu l'as configurée toi-même."
            : `${unacknowledgedCritical.length} règles de transfert suspectes détectées — vérifie si tu les as configurées toi-même.`}
        </div>
      )}

      {accountCount === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Aucun compte à auditer pour l'instant"
            description="Une fois un compte connecté, MailGuard vérifie ici les règles de transfert automatique suspectes après chaque synchronisation."
          />
        </div>
      ) : findings.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={ShieldCheck}
            title="Aucune règle suspecte détectée"
            description="Aucun transfert automatique ni règle de redirection suspecte sur tes comptes connectés."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-6">
          {findings.map((finding) => (
            <FindingRow key={finding.id} finding={finding} />
          ))}
        </div>
      )}
    </div>
  );
}
