import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { listMessages } from "@/lib/queries/messages";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageList } from "@/components/mail/MessageList";
import { MessageViewer } from "@/components/mail/MessageViewer";
import { VerdictFilterTabs } from "@/components/mail/VerdictFilterTabs";
import { UnsubscribeAllButton } from "@/components/mail/UnsubscribeAllButton";
import { TrashAllNewslettersButton } from "@/components/mail/TrashAllNewslettersButton";
import type { Verdict } from "@prisma/client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; verdict?: Verdict; cursor?: string }>;
}) {
  const { open, verdict, cursor } = await searchParams;
  const accountCount = await db.account.count();
  const { messages, nextCursor } = accountCount > 0 ? await listMessages({ verdict, cursor }) : { messages: [], nextCursor: null };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-[13px] font-semibold text-text-primary">Boîte unifiée</h1>
            <VerdictFilterTabs active={verdict} />
          </div>
          {verdict === "NEWSLETTER" && (
            <div className="flex items-center gap-2">
              <UnsubscribeAllButton />
              <TrashAllNewslettersButton />
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto">
          {accountCount === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={Inbox}
                title="Aucun compte connecté"
                description="Connecte un premier compte Gmail ou Outlook pour voir apparaître tes mails ici, triés automatiquement."
                actionHref="/accounts"
                actionLabel="Connecter un compte"
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              {verdict === "SPAM" || verdict === "PHISHING" ? (
                <EmptyState
                  icon={Inbox}
                  title={verdict === "SPAM" ? "Aucun spam en boîte de réception" : "Aucun phishing en boîte de réception"}
                  description="Normal : tout ce qui est classé Spam ou Phishing part directement en quarantaine dès la synchronisation, donc cet onglet reste vide en usage courant. Pour revoir les verdicts du moteur avant qu'ils ne partent automatiquement, active le Mode observation sur la page Comptes — les mails y resteront visibles ici le temps de vérifier."
                  actionHref="/accounts"
                  actionLabel="Voir le Mode observation"
                />
              ) : (
                <EmptyState
                  icon={Inbox}
                  title="Rien à afficher"
                  description="Aucun message ici pour l'instant. Clique sur Synchroniser pour aller chercher les nouveaux mails."
                />
              )}
            </div>
          ) : (
            <MessageList messages={messages} nextCursor={nextCursor} filters={{ verdict }} />
          )}
        </div>
      </div>

      {open && <MessageViewer messageId={open} />}
    </div>
  );
}
