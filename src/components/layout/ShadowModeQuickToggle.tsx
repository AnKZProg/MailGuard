import { Eye, ShieldAlert } from "lucide-react";
import { toggleShadowMode } from "@/app/accounts/actions";

export function ShadowModeQuickToggle({ enabled }: { enabled: boolean }) {
  return (
    <form action={toggleShadowMode}>
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <button
        type="submit"
        title={
          enabled
            ? "Mode observation actif — clique pour activer le tri automatique"
            : "Tri automatique actif — clique pour repasser en observation"
        }
        className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
      >
        {enabled ? (
          <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-verdict-newsletter" strokeWidth={1.75} />
        )}
        {enabled ? "Mode observation" : "Tri automatique actif"}
      </button>
    </form>
  );
}
