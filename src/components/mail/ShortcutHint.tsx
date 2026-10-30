/** Tiny discoverability cue for the keyboard shortcuts — the full list opens with "?". */
export function ShortcutHint() {
  return (
    <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-text-tertiary lg:flex">
      <kbd className="rounded border border-border-default bg-surface-1 px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">?</kbd>
      raccourcis
    </span>
  );
}
