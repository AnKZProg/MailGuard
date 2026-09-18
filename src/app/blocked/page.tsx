import Link from "next/link";
import { Ban } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { BlockedSenderRow } from "@/components/blocked/BlockedSenderRow";
import { listBlockedSenders } from "@/lib/queries/blocked-senders";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ cursor?: string }>;
};

export default async function BlockedPage({ searchParams }: Props) {
  const { cursor } = await searchParams;
  const { policies, nextCursor } = await listBlockedSenders(cursor);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center border-b border-border-subtle px-6">
        <h1 className="text-[13px] font-semibold text-text-primary">Bloqués</h1>
      </header>

      {policies.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={Ban}
            title="Aucun expéditeur bloqué"
            description="Les adresses et domaines que tu bloques depuis la boîte unifiée ou la quarantaine apparaissent ici, avec une option pour les débloquer."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-6">
          {policies.map((policy) => (
            <BlockedSenderRow key={policy.id} policy={policy} />
          ))}
          {nextCursor && (
            <Link
              href={{ pathname: "/blocked", query: { cursor: nextCursor } }}
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
