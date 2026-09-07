import { CheckCircle2, AlertTriangle } from "lucide-react";

const SUCCESS_MESSAGES: Record<string, string> = {
  google: "Compte Gmail connecté.",
  microsoft: "Compte Outlook connecté.",
};

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Connexion Gmail annulée — tu as refusé l'accès sur l'écran Google.",
  google_invalid_state: "La connexion Gmail a expiré ou a été interrompue, réessaie.",
  google_missing_code: "Google n'a pas renvoyé de code d'autorisation, réessaie.",
  google_exchange_failed: "L'échange avec Google a échoué. Vérifie GOOGLE_CLIENT_ID/SECRET dans .env.local.",
  microsoft_denied: "Connexion Outlook annulée — tu as refusé l'accès sur l'écran Microsoft.",
  microsoft_invalid_state: "La connexion Outlook a expiré ou a été interrompue, réessaie.",
  microsoft_missing_code: "Microsoft n'a pas renvoyé de code d'autorisation, réessaie.",
  microsoft_exchange_failed: "L'échange avec Microsoft a échoué. Vérifie MICROSOFT_CLIENT_ID/SECRET dans .env.local.",
};

type Props = {
  connected?: string;
  error?: string;
};

export function FlashBanner({ connected, error }: Props) {
  if (error) {
    const message = ERROR_MESSAGES[error] ?? "Une erreur inattendue est survenue pendant la connexion.";
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-verdict-phishing/30 bg-verdict-phishing-soft px-3.5 py-2.5 text-[13px] text-verdict-phishing">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{message}</span>
      </div>
    );
  }

  if (connected) {
    const message = SUCCESS_MESSAGES[connected] ?? "Compte connecté.";
    return (
      <div className="flex items-start gap-2.5 rounded-md border border-verdict-legitimate/30 bg-verdict-legitimate-soft px-3.5 py-2.5 text-[13px] text-verdict-legitimate">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
        <span>{message}</span>
      </div>
    );
  }

  return null;
}
