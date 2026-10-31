"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { disconnectAccount } from "@/app/accounts/actions";

/**
 * Disconnecting deletes the account row and every synced message with it, so
 * the X only arms the action: a second, explicit "Déconnecter" click submits.
 * Inline rather than window.confirm() so it reads in context and works with
 * the keyboard like the rest of the row.
 */
export function DisconnectButton({ accountId, emailAddress }: { accountId: string; emailAddress: string }) {
  const [isArmed, setIsArmed] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isArmed) confirmRef.current?.focus();
  }, [isArmed]);

  if (!isArmed) {
    return (
      <button
        type="button"
        onClick={() => setIsArmed(true)}
        title="Déconnecter ce compte"
        aria-label={`Déconnecter ${emailAddress}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-verdict-phishing-soft hover:text-verdict-phishing"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <form
      action={disconnectAccount}
      className="flex items-center gap-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsArmed(false);
      }}
    >
      <input type="hidden" name="accountId" value={accountId} />
      <button
        ref={confirmRef}
        type="submit"
        aria-label={`Confirmer la déconnexion de ${emailAddress}`}
        className="flex h-7 items-center rounded-md bg-verdict-phishing px-2.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
      >
        Déconnecter
      </button>
      <button
        type="button"
        onClick={() => setIsArmed(false)}
        className="flex h-7 items-center rounded-md px-2 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
      >
        Annuler
      </button>
    </form>
  );
}
