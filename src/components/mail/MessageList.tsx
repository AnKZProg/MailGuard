import Link from "next/link";
import { MessageRow } from "./MessageRow";
import { inboxHref, type InboxQuery } from "@/lib/queries/inbox-url";
import type { Message } from "@prisma/client";

type Props = {
  messages: (Message & { account: { emailAddress: string; colorToken: string } })[];
  nextCursor: string | null;
  query: InboxQuery;
};

export function MessageList({ messages, nextCursor, query }: Props) {
  return (
    <div className="flex flex-col">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} openHref={inboxHref({ ...query, open: message.id })} />
      ))}
      {nextCursor && (
        <Link
          href={inboxHref({ ...query, cursor: nextCursor })}
          className="border-b border-border-subtle px-4 py-3 text-center text-[12px] text-accent hover:underline"
        >
          Charger plus
        </Link>
      )}
    </div>
  );
}
