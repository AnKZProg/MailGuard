import { X } from "lucide-react";
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
