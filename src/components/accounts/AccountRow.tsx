import { X, RefreshCw } from "lucide-react";
import { ProviderMark } from "./ProviderMark";
import { StatusBadge } from "./StatusBadge";
import { OrganizeBySenderButton } from "./OrganizeBySenderButton";
import { disconnectAccount } from "@/app/accounts/actions";

type AccountRowProps = {
  id: string;
  provider: "GOOGLE" | "MICROSOFT";
  emailAddress: string;
  displayName: string | null;
  colorToken: string;
  status: "ACTIVE" | "NEEDS_RECONSENT" | "ERROR";
  lastSyncAt: Date | null;
};

// Both /start routes force a fresh consent screen (Google: prompt=consent —
// required to get a new refresh token, since Google only issues one on
// explicit consent, not on every code exchange; Microsoft: prompt=select_account)
// and upsertAccount matches on [provider, providerAccountId], so re-running
// this same flow for the same real-world account updates the existing row
// in place instead of creating a duplicate — this is genuinely how you fix
// NEEDS_RECONSENT/ERROR, just previously with no link to it from the row
// that actually shows the problem.
const RECONNECT_HREF: Record<AccountRowProps["provider"], string> = {
  GOOGLE: "/api/auth/google/start",
  MICROSOFT: "/api/auth/microsoft/start",
};

export function AccountRow({ id, provider, emailAddress, displayName, colorToken, status, lastSyncAt }: AccountRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3 last:border-b-0">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: `var(--${colorToken.replace("account-", "account-color-")})` }}
        aria-hidden
      />
      <ProviderMark provider={provider} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text-primary">{displayName || emailAddress}</p>
        <p className="truncate text-[12px] text-text-tertiary">{emailAddress}</p>
      </div>
      <span className="hidden shrink-0 text-[12px] text-text-tertiary sm:inline">
        {lastSyncAt ? `Sync. ${lastSyncAt.toLocaleString("fr-FR")}` : "Jamais synchronisé"}
      </span>
      <StatusBadge status={status} />
      {status !== "ACTIVE" && (
        <a
          href={RECONNECT_HREF[provider]}
          title="Reconnecter ce compte (réautorise via Google/Microsoft, ne crée pas de doublon)"
          className="flex h-7 items-center gap-1.5 rounded-md border border-border-default px-2 text-[12px] font-medium text-text-primary transition-colors hover:bg-surface-2"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Reconnecter
        </a>
      )}
      <OrganizeBySenderButton accountId={id} />
      <form action={disconnectAccount}>
        <input type="hidden" name="accountId" value={id} />
        <button
          type="submit"
          title="Déconnecter ce compte"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-verdict-phishing-soft hover:text-verdict-phishing"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </form>
    </div>
  );
}
