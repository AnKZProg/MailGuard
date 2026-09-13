import { ShieldAlert, ShieldCheck, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { FindingRow } from "@/components/security/FindingRow";

export const dynamic = "force-dynamic";

// Kept in sync by hand with GOOGLE_AUDIT_KINDS / MICROSOFT_AUDIT_KINDS — shown
// here so "0 findings" reads as "actively checked, nothing found" instead of
// looking like an empty, unused page. DELEGATE / ALT_ADDRESS / VACATION_SUSPICIOUS
// exist in the FindingKind enum but have no audit implementation yet (DELEGATE
// and ALT_ADDRESS would need a broader OAuth scope + re-consent; a real
// VACATION_SUSPICIOUS check would need the auto-reply body, which isn't fetched
// today) — deliberately left off this list rather than implied as covered.
const GOOGLE_CHECKS = ["Transfert automatique (compte)", "Règles avec transfert", "IMAP/POP activé"];
const MICROSOFT_CHECKS = ["Règles de boîte de réception avec transfert"];

export default async function SecurityPage() {
  const [accounts, findings] = await Promise.all([
    db.account.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, emailAddress: true, provider: true, lastSyncAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.securityFinding.findMany({
      where: { resolvedAt: null },
      include: { account: { select: { emailAddress: true } } },
      orderBy: [{ severity: "asc" }, { firstSeenAt: "desc" }],
    }),
  ]);

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

      {accounts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Aucun compte à auditer pour l'instant"
            description="Une fois un compte connecté, MailGuard vérifie ici les règles de transfert automatique suspectes après chaque synchronisation."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-6">
          <div className="rounded-lg border border-border-subtle bg-surface-1">
            <div className="border-b border-border-subtle px-4 py-3">
              <p className="text-[13px] font-medium text-text-primary">Vérifications actives</p>
              <p className="mt-0.5 text-[12px] text-text-secondary">
                Relancées à chaque synchronisation — persistance d&apos;accès classique après une prise de contrôle de
                compte (transfert silencieux configuré par un attaquant pour continuer à lire le courrier même après
                un changement de mot de passe).
              </p>
            </div>
            <div className="divide-y divide-border-subtle">
              {accounts.map((account) => {
                const checks = account.provider === "GOOGLE" ? GOOGLE_CHECKS : MICROSOFT_CHECKS;
                return (
                  <div key={account.id} className="flex flex-col gap-1.5 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-medium text-text-primary">{account.emailAddress}</span>
                      <span className="text-[11px] text-text-tertiary">
                        {account.lastSyncAt ? `Vérifié le ${account.lastSyncAt.toLocaleString("fr-FR")}` : "Jamais synchronisé"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {checks.map((check) => (
                        <span key={check} className="flex items-center gap-1.5 text-[11.5px] text-text-secondary">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-verdict-legitimate" strokeWidth={2} />
                          {check}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {findings.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-10">
              <EmptyState
                icon={ShieldCheck}
                title="Aucune règle suspecte détectée"
                description="Aucun transfert automatique ni règle de redirection suspecte sur tes comptes connectés, d'après les vérifications listées ci-dessus."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {findings.map((finding) => (
                <FindingRow key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
