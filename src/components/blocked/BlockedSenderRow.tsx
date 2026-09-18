"use client";

import { useTransition } from "react";
import { Unlock, Loader2 } from "lucide-react";
import { unblockSenderAction } from "@/app/blocked/actions";
import type { BlockedSenderPolicy } from "@/lib/queries/blocked-senders";

type Props = {
  policy: BlockedSenderPolicy;
  onUnblocked: (policyId: string) => void;
};

export function BlockedSenderRow({ policy, onUnblocked }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleUnblock = () => {
    startTransition(async () => {
      await unblockSenderAction(policy.id);
      onUnblocked(policy.id);
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">
          {policy.scope === "DOMAIN" ? `@${policy.pattern}` : policy.pattern}
        </p>
        <p className="mt-0.5 text-[12px] text-text-secondary">
          {policy.scope === "DOMAIN" ? "Domaine entier bloqué" : "Adresse bloquée"}
          {policy.account ? ` · ${policy.account.emailAddress}` : ""}
          {" · depuis le "}
          {new Date(policy.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>
      <button
        type="button"
        onClick={handleUnblock}
        disabled={isPending}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-surface-0 px-2.5 text-[12px] font-medium text-text-primary hover:bg-surface-2 disabled:opacity-60"
        title="Débloquer cet expéditeur"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
        ) : (
          <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} />
        )}
        Débloquer
      </button>
    </div>
  );
}
