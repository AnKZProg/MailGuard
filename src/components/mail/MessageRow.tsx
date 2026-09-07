import Link from "next/link";
import { Archive, Trash2 } from "lucide-react";
import { VerdictBadge } from "./VerdictBadge";
import { relativeTime } from "@/lib/format/relative-time";
import { cn } from "@/lib/cn";
import { quarantineNow, trashNow } from "@/app/actions/message-actions";
import type { Message, Verdict } from "@prisma/client";

type Props = {
  message: Message & { account: { emailAddress: string; colorToken: string } };
};

export function MessageRow({ message }: Props) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 hover:bg-surface-1",
        !message.isRead && "bg-surface-1/60",
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--${message.account.colorToken.replace("account-", "account-color-")})` }}
        title={message.account.emailAddress}
        aria-hidden
      />

      <Link href={`/?open=${message.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "w-44 shrink-0 truncate text-[13px]",
            message.isRead ? "text-text-secondary" : "font-semibold text-text-primary",
          )}
        >
          {message.fromDisplayName || message.fromAddress}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[13px]",
            message.isRead ? "text-text-tertiary" : "text-text-primary",
          )}
        >
          <span className={cn(!message.isRead && "font-medium text-text-primary")}>{message.subject || "(sans objet)"}</span>
          {message.snippet && <span className="text-text-tertiary"> — {message.snippet}</span>}
        </span>
      </Link>

      <VerdictBadge verdict={message.verdict as Verdict | null} />

      <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-text-tertiary">
        {relativeTime(message.receivedAt)}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <form action={quarantineNow.bind(null, message.id)}>
          <button type="submit" title="Mettre en quarantaine" className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-verdict-newsletter-soft hover:text-verdict-newsletter">
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
        <form action={trashNow.bind(null, message.id)}>
          <button type="submit" title="Mettre à la corbeille" className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-verdict-phishing-soft hover:text-verdict-phishing">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  );
}
