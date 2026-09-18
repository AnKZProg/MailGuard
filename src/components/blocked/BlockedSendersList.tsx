"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { loadMoreBlockedSenders } from "@/app/blocked/actions";
import { BlockedSenderRow } from "./BlockedSenderRow";
import type { BlockedSenderPolicy } from "@/lib/queries/blocked-senders";

type Props = {
  initialPolicies: BlockedSenderPolicy[];
  initialNextCursor: string | null;
  query?: string;
};

export function BlockedSendersList({ initialPolicies, initialNextCursor, query }: Props) {
  const [policies, setPolicies] = useState(initialPolicies);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    if (!nextCursor) return;
    startTransition(async () => {
      const page = await loadMoreBlockedSenders(nextCursor, query);
      // Appended below the existing rows, not replacing them — this is the
      // whole point: "Charger plus" used to be a plain <Link> that navigated
      // to a fresh /blocked?cursor=... page, discarding every row already
      // on screen instead of growing the list underneath them.
      setPolicies((prev) => [...prev, ...page.policies]);
      setNextCursor(page.nextCursor);
    });
  };

  const handleUnblocked = (policyId: string) => {
    setPolicies((prev) => prev.filter((p) => p.id !== policyId));
  };

  return (
    <div className="flex flex-col gap-2 p-6">
      {policies.map((policy) => (
        <BlockedSenderRow key={policy.id} policy={policy} onUnblocked={handleUnblocked} />
      ))}
      {nextCursor && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-4 py-2.5 text-[12px] text-accent hover:underline disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />}
          Charger plus
        </button>
      )}
    </div>
  );
}
