import { Users, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { isShadowModeEnabled } from "@/lib/settings/app-settings";
import { EmptyState } from "@/components/ui/EmptyState";
import { FlashBanner } from "@/components/accounts/FlashBanner";
import { AccountRow } from "@/components/accounts/AccountRow";
import { ShadowModeToggle } from "@/components/accounts/ShadowModeToggle";
import { FileNewMailButton } from "@/components/accounts/FileNewMailButton";
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Comptes</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/auth/google/start"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Compte Gmail
          </a>
          <a
            href="/api/auth/microsoft/start"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default px-3 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            Compte Outlook
          </a>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-6">
        <FlashBanner connected={connected} error={error} />
        <ShadowModeToggle enabled={shadowMode} />
        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-text-primary">Rangement des nouveaux mails</p>
            <p className="text-[12px] text-text-secondary">
              Range directement les mails fraîchement reçus dans le dossier de marque déjà créé qui leur correspond, sur
              tous les comptes — ne crée jamais de nouveau dossier.
            </p>
          </div>
          <FileNewMailButton />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-text-primary">Courrier indésirable en attente</p>
            <p className="text-[12px] text-text-secondary">
              Supprime immédiatement (direction corbeille) tout ce qui est classé Spam ou Phishing et encore en boîte de réception.
            </p>
          </div>
          <TrashAllJunkButton />
        </div>

        {accounts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <EmptyState
              icon={Users}
              title="Aucun compte connecté"
              description="Connecte un compte Gmail ou Outlook avec les boutons ci-dessus. Voir docs/setup-google.md et docs/setup-azure.md pour la configuration initiale (une seule fois, 5 minutes)."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border-subtle">
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
      </div>
    </div>
  );
}
