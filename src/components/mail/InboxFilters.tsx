"use client";

import { Search } from "lucide-react";
import type { InboxQuery } from "@/lib/queries/inbox-url";

type Props = {
  query: InboxQuery;
  accounts: { id: string; emailAddress: string }[];
};

/** Plain GET form (works without JS); the account picker just submits on change. */
export function InboxFilters({ query, accounts }: Props) {
  return (
    <form action="/" role="search" className="flex items-center gap-2">
      {query.verdict && <input type="hidden" name="verdict" value={query.verdict} />}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
          strokeWidth={1.75}
        />
        <input
          type="search"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Rechercher expéditeur, sujet…"
          aria-label="Rechercher dans la boîte unifiée"
          className="h-8 w-60 rounded-md border border-border-default bg-surface-1 pl-8 pr-3 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      {accounts.length > 1 && (
        <select
          name="account"
          defaultValue={query.account ?? ""}
          aria-label="Filtrer par compte"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-8 max-w-52 truncate rounded-md border border-border-default bg-surface-1 px-2 text-[12.5px] text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
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
