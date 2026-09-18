import Link from "next/link";
import { Ban, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockedSenderRow } from "@/components/blocked/BlockedSenderRow";
import { listBlockedSenders } from "@/lib/queries/blocked-senders";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ cursor?: string; q?: string }>;
};

export default async function BlockedPage({ searchParams }: Props) {
  const { cursor, q } = await searchParams;
  const { policies, nextCursor } = await listBlockedSenders(cursor, q);
  const hasSearch = Boolean(q?.trim());

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border-subtle px-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Bloqués</h1>
        {(policies.length > 0 || hasSearch) && (
          <form action="/blocked" className="ml-auto flex items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" strokeWidth={1.75} />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Rechercher une adresse ou un domaine…"
                className="h-8 w-72 rounded-md border border-border-default bg-surface-1 pl-8 pr-3 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </form>
        )}
      </header>

      {policies.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          {hasSearch ? (
            <EmptyState
              icon={Search}
              title="Aucun résultat"
              description={`Aucun expéditeur bloqué ne correspond à « ${q?.trim()} ».`}
            />
          ) : (
            <EmptyState
              icon={Ban}
              title="Aucun expéditeur bloqué"
              description="Les adresses et domaines que tu bloques depuis la boîte unifiée ou la quarantaine apparaissent ici, avec une option pour les débloquer."
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-6">
          {policies.map((policy) => (
            <BlockedSenderRow key={policy.id} policy={policy} />
          ))}
          {nextCursor && (
            <Link
              href={{ pathname: "/blocked", query: q ? { cursor: nextCursor, q } : { cursor: nextCursor } }}
              className="rounded-lg border border-border-subtle px-4 py-2.5 text-center text-[12px] text-accent hover:underline"
            >
              Charger plus
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
