import { Archive } from "lucide-react";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuarantineRow } from "@/components/quarantine/QuarantineRow";
import { QuarantineBulkActions } from "@/components/quarantine/QuarantineBulkActions";
import { connection } from "next/server";

// Quarantine shows the same mails the purge job will act on — keep the count live, not from a cached build.
async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

// Reads live quarantine state on every request — nothing here is safe to bake into
// a static build-time snapshot the way Next would otherwise try to.
export const dynamic = "force-dynamic";

export default async function QuarantinePage() {
  const now = await requestTime();
  const items = await db.quarantineItem.findMany({
    where: { restoredAt: null, purgedAt: null },
    include: { message: { include: { account: { select: { emailAddress: true } } } } },
    orderBy: { purgeAfter: "asc" },
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-[14px] font-semibold tracking-tight text-text-primary">Quarantaine</h1>
          <span className="text-[12px] tabular-nums text-text-tertiary">
            {items.length} mail{items.length > 1 ? "s" : ""}
          </span>
        </div>
        <QuarantineBulkActions itemCount={items.length} />
      </header>

      <p className="border-b border-border-subtle bg-surface-1 px-6 py-2 text-[12px] text-text-tertiary">
        Rien n&apos;est supprimé définitivement : chaque mail reste récupérable tant qu&apos;il est ici.
      </p>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={Archive}
            title="Rien en quarantaine"
            description="Les mails suspects mis de côté par le moteur de tri apparaîtront ici, avec un compte à rebours avant purge."
          />
        </div>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => (
            <QuarantineRow key={item.id} item={item} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
