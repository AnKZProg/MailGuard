import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { listMessages } from "@/lib/queries/messages";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageList } from "@/components/mail/MessageList";
import { MessageViewer } from "@/components/mail/MessageViewer";
import { VerdictFilterTabs } from "@/components/mail/VerdictFilterTabs";
import { UnsubscribeAllButton } from "@/components/mail/UnsubscribeAllButton";
import { TrashAllNewslettersButton } from "@/components/mail/TrashAllNewslettersButton";
import { InboxFilters } from "@/components/mail/InboxFilters";
import { inboxHref, parseInboxQuery } from "@/lib/queries/inbox-url";
import { searchMailContent } from "@/lib/queries/content-search";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string; verdict?: string; account?: string; q?: string; body?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const { open, cursor } = params;
  const query = parseInboxQuery(params);
  const { verdict } = query;
  const accounts = await db.account.findMany({ select: { id: true, emailAddress: true }, orderBy: { emailAddress: "asc" } });
  const contentSearch = query.q && query.body ? await searchMailContent(query.q, query.account) : null;
  const { messages, nextCursor } =
    accounts.length > 0
      ? await listMessages({
          verdict,
          accountId: query.account,
          search: query.q,
          contentMatches: contentSearch?.matches,
          cursor,
        })
      : { messages: [], nextCursor: null };
  const accountCount = accounts.length;
  const isFiltered = Boolean(query.q || query.account);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-[13px] font-semibold text-text-primary">Boîte unifiée</h1>
            <VerdictFilterTabs query={query} />
          </div>
          <div className="flex items-center gap-2">
            {accountCount > 0 && <InboxFilters query={query} accounts={accounts} />}
            {verdict === "NEWSLETTER" && !isFiltered && (
              <>
                <UnsubscribeAllButton />
                <TrashAllNewslettersButton />
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {contentSearch && contentSearch.failedAccounts.length > 0 && (
            <p className="border-b border-border-subtle bg-surface-1 px-6 py-2 text-[12px] text-text-tertiary">
              Recherche dans le contenu indisponible pour : {contentSearch.failedAccounts.join(", ")}.
            </p>
          )}
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
              {isFiltered ? (
                <EmptyState
                  icon={Inbox}
                  title="Aucun résultat"
                  description="Aucun mail ne correspond à cette recherche ou à ce compte dans la boîte unifiée."
                  actionHref={inboxHref({ verdict })}
                  actionLabel="Effacer les filtres"
                />
              ) : verdict === "SPAM" || verdict === "PHISHING" ? (
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
            <MessageList messages={messages} nextCursor={nextCursor} query={query} />
          )}
        </div>
      </div>

      {open && <MessageViewer messageId={open} closeHref={inboxHref(query)} />}
    </div>
  );
}
