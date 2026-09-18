import { Unlock } from "lucide-react";
import { unblockSenderAction } from "@/app/blocked/actions";
import type { SenderPolicy } from "@prisma/client";

type Props = {
  policy: SenderPolicy & { account: { emailAddress: string } | null };
};

export function BlockedSenderRow({ policy }: Props) {
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
          {policy.createdAt.toLocaleDateString("fr-FR")}
        </p>
      </div>
      <form action={unblockSenderAction.bind(null, policy.id)}>
        <button
          type="submit"
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-surface-0 px-2.5 text-[12px] font-medium text-text-primary hover:bg-surface-2"
          title="Débloquer cet expéditeur"
        >
          <Unlock className="h-3.5 w-3.5" strokeWidth={1.75} />
          Débloquer
        </button>
      </form>
    </div>
  );
}
