import { ShieldAlert, ShieldCheck, Check } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { FindingRow } from "@/components/security/FindingRow";
import { formatDateTime } from "@/lib/format/mail-date";

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

  const critical = findings.filter((f) => f.severity === "CRITICAL" && !f.acknowledgedAt);
  const others = findings.filter((f) => !(f.severity === "CRITICAL" && !f.acknowledgedAt));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-6">
        <h1 className="text-[14px] font-semibold tracking-tight text-text-primary">Sécurité</h1>
        <span className="text-[12px] text-text-tertiary">Audit des accès à tes comptes</span>
      </header>

      {accounts.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={ShieldAlert}
            title="Aucun compte à auditer pour l'instant"
            description="Une fois un compte connecté, MailGuard vérifie ici les règles de transfert automatique suspectes après chaque synchronisation."
          />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
          {critical.length > 0 ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-verdict-phishing/30 bg-verdict-phishing-soft px-4 py-3"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-verdict-phishing" strokeWidth={1.75} />
              <div>
                <p className="text-[13px] font-semibold text-verdict-phishing">
                  {critical.length === 1 ? "Une règle de transfert à vérifier" : `${critical.length} règles de transfert à vérifier`}
                </p>
                <p className="mt-0.5 text-[12.5px] text-text-secondary">
                  Si tu ne les as pas créées toi-même, quelqu&apos;un peut lire ton courrier à ta place. Change le mot de
                  passe du compte, puis supprime la règle.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-verdict-legitimate/25 bg-verdict-legitimate-soft px-4 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-verdict-legitimate" strokeWidth={1.75} />
              <p className="text-[13px] font-medium text-text-primary">
                Aucun transfert suspect sur {accounts.length === 1 ? "ton compte" : `tes ${accounts.length} comptes`}.
              </p>
            </div>
          )}

          <section aria-labelledby="checks-title" className="flex flex-col gap-2">
            <h2 id="checks-title" className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Vérifications automatiques
            </h2>
            <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-0">
              {accounts.map((account) => {
                const checks = account.provider === "GOOGLE" ? GOOGLE_CHECKS : MICROSOFT_CHECKS;
                return (
                  <div key={account.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] font-medium text-text-primary">{account.emailAddress}</span>
                      <span className="shrink-0 text-[11.5px] tabular-nums text-text-tertiary">
                        {account.lastSyncAt ? `vérifié ${formatDateTime(account.lastSyncAt)}` : "jamais vérifié"}
                      </span>
                    </div>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {checks.map((check) => (
                        <li key={check} className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                          <Check className="h-3 w-3 shrink-0 text-text-tertiary" strokeWidth={2.25} />
                          {check}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {others.length > 0 && (
            <section aria-labelledby="findings-title" className="flex flex-col gap-2">
              <h2 id="findings-title" className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                À examiner
              </h2>
              <div className="flex flex-col gap-2">
                {others.map((finding) => (
                  <FindingRow key={finding.id} finding={finding} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
