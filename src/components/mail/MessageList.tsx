import Link from "next/link";
import { MessageRow } from "./MessageRow";
import type { MessageListFilters } from "@/lib/queries/messages";
import type { Message } from "@prisma/client";

type Props = {
  messages: (Message & { account: { emailAddress: string; colorToken: string } })[];
  nextCursor: string | null;
  filters: Omit<MessageListFilters, "cursor">;
};

export function MessageList({ messages, nextCursor, filters }: Props) {
  return (
    <div className="flex flex-col">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
      {nextCursor && (
        <Link
          href={{ pathname: "/", query: { ...filters, cursor: nextCursor } }}
          className="border-b border-border-subtle px-4 py-3 text-center text-[12px] text-accent hover:underline"
        >
          Charger plus
        </Link>
      )}
    </div>
  );
}
