import Link from "next/link";
import { X, Archive, Trash2, ShieldCheck, ShieldOff, ExternalLink, ChevronRight } from "lucide-react";
import type { Provider } from "@prisma/client";
import { db } from "@/lib/db";
import { longMailDate } from "@/lib/format/mail-date";
import { isFreemailDomain } from "@/lib/classify/learner/bayes";
import { SignalExplainer } from "./SignalExplainer";
import { MessageBody } from "./MessageBody";
import { VerdictCorrection } from "./VerdictCorrection";
import { SenderAvatar } from "./SenderAvatar";
import { quarantineNow, trashNow, allowSender, blockSender } from "@/app/actions/message-actions";

function providerWebLink(provider: Provider, accountEmail: string, providerMessageId: string): string {
  return provider === "GOOGLE"
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(accountEmail)}#all/${encodeURIComponent(providerMessageId)}`
    : `https://outlook.live.com/mail/0/deeplink/read/${encodeURIComponent(providerMessageId)}`;
}

const toolbarButton =
  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary";

export async function MessageViewer({ messageId, closeHref }: { messageId: string; closeHref: string }) {
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { account: true, signals: true },
  });

  if (!message) {
    return (
      <section className="flex flex-1 items-center justify-center bg-surface-0 p-6">
        <p className="text-[13px] text-text-tertiary">Ce message n&apos;existe plus.</p>
      </section>
    );
  }

  // Blocking "gmail.com" would block every Gmail user on earth — scope to the address for shared providers.
  const senderScope = isFreemailDomain(message.fromDomain) ? "ADDRESS" : "DOMAIN";
  const senderTarget = senderScope === "ADDRESS" ? message.fromAddress : message.fromDomain;
  const providerName = message.account.provider === "GOOGLE" ? "Gmail" : "Outlook";

  return (
    <section aria-label="Lecture du message" className="animate-fade-in flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-0">
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border-subtle px-3">
        <Link href={closeHref} aria-label="Fermer (Échap)" title="Fermer (Échap)" className={toolbarButton}>
          <X className="h-4 w-4" strokeWidth={1.75} />
        </Link>
        <span className="mx-1 h-5 w-px bg-border-subtle" aria-hidden />
        <form action={quarantineNow.bind(null, message.id)}>
          <button type="submit" className={toolbarButton} title="Mettre en quarantaine (e)">
            <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
            Quarantaine
          </button>
        </form>
        <form action={trashNow.bind(null, message.id)}>
          <button type="submit" className={toolbarButton} title="Mettre à la corbeille (#)">
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            Corbeille
          </button>
        </form>
        <span className="mx-1 h-5 w-px bg-border-subtle" aria-hidden />
        <form action={allowSender.bind(null, message.id, senderScope)}>
          <button type="submit" className={toolbarButton} title={`Toujours autoriser ${senderTarget}`}>
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Autoriser
          </button>
        </form>
        <form action={blockSender.bind(null, message.id, senderScope)}>
          <button type="submit" className={toolbarButton} title={`Toujours bloquer ${senderTarget}`}>
            <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            Bloquer
          </button>
        </form>
        <a
          href={providerWebLink(message.account.provider, message.account.emailAddress, message.providerMessageId)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${toolbarButton} ml-auto`}
          title={`Ouvrir ce mail dans ${providerName}`}
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden xl:inline">Ouvrir dans {providerName}</span>
        </a>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 pt-5">
          <h2 className="text-[19px] font-semibold leading-snug tracking-tight text-text-primary">
            {message.subject || "(sans objet)"}
          </h2>

          <div className="flex items-start gap-3">
            <SenderAvatar name={message.fromDisplayName} address={message.fromAddress} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-text-primary">
                {message.fromDisplayName || message.fromAddress}
              </p>
              <p className="truncate text-[12px] text-text-tertiary">
                {message.fromDisplayName && <span className="text-text-secondary">{message.fromAddress}</span>}
                {message.fromDisplayName && " · "}à {message.account.emailAddress}
              </p>
            </div>
            <time className="shrink-0 pt-0.5 text-[12px] text-text-tertiary">{longMailDate(message.receivedAt)}</time>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <VerdictCorrection
                messageId={message.id}
                current={message.userVerdict ?? message.verdict}
                confirmedByUser={message.userVerdict !== null}
              />
            </div>
            {message.signals.length > 0 && (
              <details className="group/why">
                <summary className="flex cursor-pointer list-none items-center gap-1 text-[12px] font-medium text-text-secondary hover:text-text-primary">
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-open/why:rotate-90" strokeWidth={1.75} />
                  Pourquoi ce verdict ? ({message.signals.length} signal{message.signals.length > 1 ? "s" : ""})
                </summary>
                <div className="pt-2 pl-5">
                  <SignalExplainer signals={message.signals} />
                </div>
              </details>
            )}
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-4">
          <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-border-subtle">
            <MessageBody key={message.id} messageId={message.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
