import { Users, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlashBanner } from "@/components/accounts/FlashBanner";
import { AccountRow } from "@/components/accounts/AccountRow";
import { ShadowModeToggle } from "@/components/accounts/ShadowModeToggle";
import { FileNewMailButton } from "@/components/accounts/FileNewMailButton";
import { OrganizeAllBySenderButton } from "@/components/accounts/OrganizeAllBySenderButton";
import { TrashAllJunkButton } from "@/components/accounts/TrashAllJunkButton";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const [accounts, shadowMode] = await Promise.all([
    db.account.findMany({ orderBy: { createdAt: "asc" } }),
    isShadowModeEnabled(),
  ]);
  const needsAttention = accounts.filter((a) => a.status !== "ACTIVE").length;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[14px] font-semibold tracking-tight text-text-primary">Comptes</h1>
          <span className="text-[12px] tabular-nums text-text-tertiary">
            {accounts.length} connecté{accounts.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/auth/google/start"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Gmail
          </a>
          <a
            href="/api/auth/microsoft/start"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Outlook
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <FlashBanner connected={connected} error={error} />
        {needsAttention > 0 && !connected && !error && (
          <p className="rounded-md border border-verdict-newsletter/30 bg-verdict-newsletter-soft px-3.5 py-2.5 text-[13px] text-verdict-newsletter">
            {needsAttention === 1
              ? "Un compte doit être reconnecté pour continuer d'être surveillé."
              : `${needsAttention} comptes doivent être reconnectés pour continuer d'être surveillés.`}
          </p>
        )}

        <section aria-labelledby="accounts-title" className="flex flex-col gap-2">
          <h2 id="accounts-title" className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Boîtes connectées
          </h2>
          {accounts.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border-default py-14">
              <EmptyState
                icon={Users}
                title="Aucun compte connecté"
                description="Connecte un compte Gmail ou Outlook avec les boutons en haut. Voir docs/setup-google.md et docs/setup-azure.md pour la configuration initiale (une seule fois, 5 minutes)."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-0">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  id={account.id}
                  provider={account.provider}
                  emailAddress={account.emailAddress}
                  displayName={account.displayName}
                  colorToken={account.colorToken}
                  status={account.status}
                  lastSyncAt={account.lastSyncAt}
                />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="behaviour-title" className="flex flex-col gap-2">
          <h2 id="behaviour-title" className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Comportement
          </h2>
          <ShadowModeToggle enabled={shadowMode} />
        </section>

        <section aria-labelledby="maintenance-title" className="flex flex-col gap-2">
          <h2 id="maintenance-title" className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Maintenance
          </h2>
          <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-0">
            <MaintenanceRow
              title="Ranger les nouveaux mails"
              description="Range les mails frais dans le dossier de marque qui leur correspond, sur tous les comptes. Ne crée jamais de dossier."
            >
              <FileNewMailButton />
            </MaintenanceRow>
            <MaintenanceRow
              title="Créer les dossiers par marque"
              description="Scanne toute la boîte de chaque compte et crée (ou réutilise) un dossier MailGuard › Marques pour chaque expéditeur récurrent."
            >
              <OrganizeAllBySenderButton />
            </MaintenanceRow>
            <MaintenanceRow
              title="Vider le courrier indésirable"
              description="Envoie à la corbeille tout ce qui est classé Spam ou Phishing mais reste en boîte de réception. Récupérable."
            >
              <TrashAllJunkButton />
            </MaintenanceRow>
          </div>
        </section>
      </div>
    </div>
  );
}

function MaintenanceRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text-primary">{title}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
