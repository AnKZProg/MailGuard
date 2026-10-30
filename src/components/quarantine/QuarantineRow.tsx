import { RotateCcw } from "lucide-react";
import { VerdictBadge } from "@/components/mail/VerdictBadge";
import { SenderAvatar } from "@/components/mail/SenderAvatar";
import { restoreNow } from "@/app/actions/message-actions";
import { formatDateTime } from "@/lib/format/mail-date";
import type { Message, QuarantineItem, Verdict } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

function purgeLabel(purgeAfter: Date, now: number): { text: string; urgent: boolean } {
  const days = Math.ceil((purgeAfter.getTime() - now) / DAY_MS);
  if (days <= 0) return { text: "purge imminente", urgent: true };
  if (days === 1) return { text: "purge demain", urgent: true };
  return { text: `purge dans ${days} jours`, urgent: days <= 3 };
}

type Props = {
  item: QuarantineItem & { message: Message & { account: { emailAddress: string } } };
  now: number;
};

export function QuarantineRow({ item, now }: Props) {
  const { message } = item;
  const purge = purgeLabel(item.purgeAfter, now);
  return (
    <div className="group flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 transition-colors hover:bg-surface-1">
      <SenderAvatar name={message.fromDisplayName} address={message.fromAddress} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-text-primary">{message.subject || "(sans objet)"}</p>
          <VerdictBadge verdict={message.verdict as Verdict | null} />
        </div>
        <p className="truncate text-[12px] text-text-tertiary">
          {message.fromDisplayName || message.fromAddress}
          <span className="mx-1.5 text-border-default">·</span>
          {message.account.emailAddress}
          <span className="mx-1.5 text-border-default">·</span>
          reçu {formatDateTime(message.receivedAt)}
        </p>
      </div>
      <span
        className={
          purge.urgent
            ? "shrink-0 text-[12px] font-medium tabular-nums text-verdict-phishing"
            : "shrink-0 text-[12px] tabular-nums text-text-tertiary"
        }
      >
        {purge.text}
      </span>
      <form action={restoreNow.bind(null, item.messageId)}>
        <button
          type="submit"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border-default bg-surface-0 px-2.5 text-[12px] font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Restaurer
        </button>
      </form>
    </div>
  );
}
