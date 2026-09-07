import { RotateCcw } from "lucide-react";
import { VerdictBadge } from "@/components/mail/VerdictBadge";
import { restoreNow } from "@/app/actions/message-actions";
import type { Message, QuarantineItem, Verdict } from "@prisma/client";

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

type Props = {
  item: QuarantineItem & { message: Message & { account: { emailAddress: string } } };
};

export function QuarantineRow({ item }: Props) {
  const days = daysUntil(item.purgeAfter);
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5">
      <VerdictBadge verdict={item.message.verdict as Verdict | null} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">{item.message.subject || "(sans objet)"}</p>
        <p className="truncate text-[12px] text-text-tertiary">
          {item.message.fromDisplayName || item.message.fromAddress} · {item.message.account.emailAddress}
        </p>
      </div>
      <span className="shrink-0 text-[12px] tabular-nums text-text-tertiary">
        {days === 0 ? "Purge aujourd'hui" : `Purge dans ${days} j`}
      </span>
      <form action={restoreNow.bind(null, item.messageId)}>
        <button
          type="submit"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border-default px-2.5 text-[12px] font-medium text-text-primary hover:bg-surface-2"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Restaurer
        </button>
      </form>
    </div>
  );
}
