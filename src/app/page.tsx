import { Inbox, MailCheck, SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { cn } from "@/lib/cn";
import { countByVerdict, listMessages } from "@/lib/queries/messages";
import { EmptyState } from "@/components/ui/EmptyState";
import { InboxList } from "@/components/mail/InboxList";
import { MessageViewer } from "@/components/mail/MessageViewer";
import { VerdictFilterTabs } from "@/components/mail/VerdictFilterTabs";
import { UnsubscribeAllButton } from "@/components/mail/UnsubscribeAllButton";
import { TrashAllNewslettersButton } from "@/components/mail/TrashAllNewslettersButton";
import { InboxFilters } from "@/components/mail/InboxFilters";
import { ShortcutHint } from "@/components/mail/ShortcutHint";
import { inboxHref, parseInboxQuery } from "@/lib/queries/inbox-url";
import { toInboxRows } from "@/lib/queries/inbox-rows";
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
  const [{ messages, nextCursor }, verdictCounts, unreadCount] =
    accounts.length > 0
      ? await Promise.all([
          listMessages({ verdict, accountId: query.account, search: query.q, contentMatches: contentSearch?.matches, cursor }),
          query.q ? Promise.resolve(undefined) : countByVerdict(query.account),
          db.message.count({ where: { state: "INBOX", isRead: false, accountId: query.account } }),
        ])
      : [{ messages: [], nextCursor: null }, undefined, 0];

  const counts = verdictCounts && {
    ...verdictCounts,
    ALL: Object.values(verdictCounts).reduce((sum, n) => sum + n, 0),
  };
  const rows = toInboxRows(messages, query);
  const isFiltered = Boolean(query.q || query.account);
  const closeHref = inboxHref(query);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Phones show either the list or the open message, never both squeezed side by side. */}
      <section
        className={cn(
          "flex-col overflow-hidden",
          open ? "hidden md:flex md:w-[min(460px,42%)] md:shrink-0 md:border-r md:border-border-subtle" : "flex flex-1",
        )}
      >
        <header className="shrink-0 border-b border-border-subtle">
          <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
            <div className="flex shrink-0 items-baseline gap-2">
              <h1 className="text-[14px] font-semibold tracking-tight text-text-primary">Boîte unifiée</h1>
              {unreadCount > 0 && (
                <span className="text-[12px] tabular-nums text-text-tertiary">{unreadCount} non lus</span>
              )}
            </div>
            {/* Narrow list (phone, or reading pane open): search wraps to its own full-width row instead of shrinking. */}
            {accounts.length > 0 && (
              <div className={cn("order-last flex w-full min-w-0", !open && "md:order-none md:w-auto md:flex-1")}>
                <InboxFilters query={query} accounts={accounts} />
              </div>
            )}
            {!open && <ShortcutHint />}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <div className="min-w-0 max-w-full">
              <VerdictFilterTabs query={query} counts={counts} />
            </div>
            {verdict === "NEWSLETTER" && !isFiltered && (
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <UnsubscribeAllButton />
                <TrashAllNewslettersButton />
              </div>
            )}
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto">
          {contentSearch && contentSearch.failedAccounts.length > 0 && (
            <p className="border-b border-border-subtle bg-surface-1 px-4 py-2 text-[12px] text-text-tertiary">
              Recherche dans le contenu indisponible pour : {contentSearch.failedAccounts.join(", ")}.
            </p>
          )}
          {accounts.length === 0 ? (
            <Centered>
              <EmptyState
                icon={Inbox}
                title="Aucun compte connecté"
                description="Connecte un premier compte Gmail ou Outlook pour voir apparaître tes mails ici, triés automatiquement."
                actionHref="/accounts"
                actionLabel="Connecter un compte"
              />
            </Centered>
          ) : rows.length === 0 ? (
            <Centered>
              {isFiltered ? (
                <EmptyState
                  icon={SearchX}
                  title="Aucun résultat"
                  description={
                    query.q && !query.body
                      ? "Rien dans les expéditeurs, sujets et aperçus. Active la recherche dans le texte (icône à droite du champ) pour aller plus loin."
                      : "Aucun mail ne correspond à cette recherche ou à ce compte."
                  }
                  actionHref={inboxHref({ verdict })}
                  actionLabel="Effacer les filtres"
                />
              ) : verdict === "SPAM" || verdict === "PHISHING" ? (
                <EmptyState
                  icon={MailCheck}
                  title={verdict === "SPAM" ? "Aucun spam ici" : "Aucun phishing ici"}
                  description="Tout ce qui est classé Spam ou Phishing part directement en quarantaine à la synchronisation. Active le Mode observation (page Comptes) pour relire les verdicts avant qu'ils ne partent."
                  actionHref="/quarantine"
                  actionLabel="Voir la quarantaine"
                />
              ) : (
                <EmptyState
                  icon={MailCheck}
                  title="Boîte à jour"
                  description="Aucun message ici pour l'instant. Les nouveaux mails arrivent automatiquement toutes les 5 minutes."
                />
              )}
            </Centered>
          ) : (
            <InboxList
              rows={rows}
              openId={open}
              closeHref={closeHref}
              loadMoreHref={nextCursor ? inboxHref({ ...query, cursor: nextCursor }) : null}
            />
          )}
        </div>
      </section>

      {open && <MessageViewer messageId={open} closeHref={closeHref} />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6">{children}</div>;
}
