import { Eye, ShieldAlert } from "lucide-react";
import { toggleShadowMode } from "@/app/accounts/actions";

export function ShadowModeToggle({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
      <div className="flex items-start gap-2.5">
        {enabled ? (
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" strokeWidth={1.5} />
        ) : (
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-verdict-newsletter" strokeWidth={1.5} />
        )}
        <div>
          <p className="text-[13px] font-medium text-text-primary">Mode observation</p>
          <p className="text-[12px] text-text-secondary">
            {enabled
              ? "Le moteur affiche ses verdicts mais ne déplace rien automatiquement. Désactive une fois que tu as vérifié qu'il ne se trompe pas."
              : "Le moteur met automatiquement le spam et le phishing en quarantaine."}
          </p>
        </div>
      </div>
      <form action={toggleShadowMode}>
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <button
          type="submit"
          className="shrink-0 rounded-md border border-border-default px-3 py-1.5 text-[12px] font-medium text-text-primary hover:bg-surface-2"
        >
          {enabled ? "Activer le tri automatique" : "Repasser en observation"}
        </button>
      </form>
    </div>
  );
}
