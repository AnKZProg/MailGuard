import Link from "next/link";
import { X, Archive, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { db } from "@/lib/db";
import { VerdictBadge } from "./VerdictBadge";
import { SignalExplainer } from "./SignalExplainer";
import { MessageBody } from "./MessageBody";
import { quarantineNow, trashNow, allowSender, blockSender } from "@/app/actions/message-actions";

export async function MessageViewer({ messageId }: { messageId: string }) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { account: true, signals: true },
  });

  if (!message) {
    return (
      <aside className="flex w-[420px] shrink-0 flex-col border-l border-border-subtle bg-surface-1 p-4">
        <p className="text-[13px] text-text-tertiary">Ce message n&apos;existe plus.</p>
      </aside>
    );
  }

  return (
    <aside className="animate-slide-in-right flex w-[420px] shrink-0 flex-col border-l border-border-subtle bg-surface-0">
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <VerdictBadge verdict={message.verdict} />
        <Link href="/" className="flex h-6 w-6 items-center justify-center rounded text-text-tertiary hover:bg-surface-2">
          <X className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      </header>

      <div className="flex flex-col gap-1 border-b border-border-subtle px-4 py-3">
        <h2 className="text-[14px] font-semibold text-text-primary">{message.subject || "(sans objet)"}</h2>
        <p className="text-[12px] text-text-secondary">
          {message.fromDisplayName ? `${message.fromDisplayName} · ` : ""}
          {message.fromAddress}
        </p>
        <p className="text-[11px] text-text-tertiary">via {message.account.emailAddress}</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border-subtle px-3 py-2">
        <form action={quarantineNow.bind(null, message.id)}>
          <button type="submit" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-text-secondary hover:bg-surface-2" title="Mettre en quarantaine">
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
            Quarantaine
          </button>
        </form>
        <form action={trashNow.bind(null, message.id)}>
          <button type="submit" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-text-secondary hover:bg-surface-2" title="Corbeille">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Corbeille
          </button>
        </form>
        <form action={allowSender.bind(null, message.id, "DOMAIN")}>
          <button type="submit" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-text-secondary hover:bg-surface-2" title="Toujours autoriser ce domaine">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Autoriser
          </button>
        </form>
        <form action={blockSender.bind(null, message.id, "DOMAIN")}>
          <button type="submit" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-text-secondary hover:bg-surface-2" title="Toujours bloquer ce domaine">
            <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            Bloquer
          </button>
        </form>
      </div>

      {message.signals.length > 0 && (
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">Signaux détectés</p>
          <SignalExplainer signals={message.signals} />
        </div>
      )}

      <MessageBody key={message.id} messageId={message.id} />
    </aside>
  );
}
