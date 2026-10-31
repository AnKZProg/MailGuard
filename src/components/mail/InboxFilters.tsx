"use client";

import { FileText, Search } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { InboxQuery } from "@/lib/queries/inbox-url";

type Props = {
  query: InboxQuery;
  accounts: { id: string; emailAddress: string }[];
};

/** Plain GET form (works without JS); the account picker and content toggle just submit it. */
export function InboxFilters({ query, accounts }: Props) {
  const [searchBody, setSearchBody] = useState(query.body === "1");
  const bodyInput = useRef<HTMLInputElement>(null);

  return (
    <form action="/" role="search" className="flex min-w-0 flex-1 items-center gap-2">
      {query.verdict && <input type="hidden" name="verdict" value={query.verdict} />}
      <input ref={bodyInput} type="hidden" name="body" value="1" disabled={!searchBody} />
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
          strokeWidth={1.75}
        />
        <input
          id="inbox-search"
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder={searchBody ? "Rechercher, y compris dans le texte…" : "Rechercher expéditeur, sujet…"}
          aria-label="Rechercher dans la boîte unifiée"
          className="h-8 w-full rounded-md border border-border-default bg-surface-1 pl-8 pr-9 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
        <button
          type="button"
          aria-pressed={searchBody}
          title={
            searchBody
              ? "Recherche dans le texte des mails activée (via Gmail/Outlook) — clique pour la désactiver"
              : "Chercher aussi dans le texte des mails (via Gmail/Outlook, un peu plus lent)"
          }
          onClick={(event) => {
            const form = event.currentTarget.form;
            const next = !searchBody;
            setSearchBody(next);
            // Set it directly so the submit below already carries the new value (state lands a render later).
            if (bodyInput.current) bodyInput.current.disabled = !next;
            const searchField = form?.elements.namedItem("q") as HTMLInputElement | null;
            if (searchField?.value) form?.requestSubmit();
          }}
          className={cn(
            "absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded transition-colors",
            searchBody ? "bg-accent-soft text-accent-strong" : "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary",
          )}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
      {accounts.length > 1 && (
        <select
          name="account"
          defaultValue={query.account ?? ""}
          aria-label="Filtrer par compte"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-8 w-28 shrink-0 truncate rounded-md sm:w-36 border border-border-default bg-surface-1 px-2 text-[12.5px] text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          <option value="">Tous les comptes</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.emailAddress}
            </option>
          ))}
        </select>
      )}
    </form>
  );
}
