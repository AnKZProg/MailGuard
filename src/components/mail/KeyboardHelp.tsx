"use client";

const SHORTCUTS: [string[], string][] = [
  [["j", "↓"], "Mail suivant"],
  [["k", "↑"], "Mail précédent"],
  [["Entrée", "o"], "Ouvrir"],
  [["Échap"], "Fermer le mail"],
  [["e"], "Mettre en quarantaine"],
  [["#", "Suppr"], "Mettre à la corbeille"],
  [["/"], "Rechercher"],
  [["Ctrl", "K"], "Palette de commandes"],
  [["?"], "Afficher / masquer cette aide"],
];

export function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-help-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-border-default bg-surface-0 p-5 shadow-[var(--elevation-lg)]"
      >
        <h2 id="kbd-help-title" className="mb-3 text-[14px] font-semibold text-text-primary">
          Raccourcis clavier
        </h2>
        <ul className="flex flex-col gap-2">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between gap-4 text-[13px] text-text-secondary">
              <span>{label}</span>
              <span className="flex gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="min-w-6 rounded border border-border-default bg-surface-1 px-1.5 py-0.5 text-center font-mono text-[11px] text-text-primary"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
