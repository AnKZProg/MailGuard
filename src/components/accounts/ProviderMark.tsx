const LABEL: Record<"GOOGLE" | "MICROSOFT", { letter: string; title: string }> = {
  GOOGLE: { letter: "G", title: "Gmail" },
  MICROSOFT: { letter: "M", title: "Outlook" },
};

type Props = {
  provider: "GOOGLE" | "MICROSOFT";
};

export function ProviderMark({ provider }: Props) {
  const { letter, title } = LABEL[provider];
  return (
    <span
      title={title}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border-default bg-surface-2 text-[10px] font-semibold text-text-secondary"
    >
      {letter}
    </span>
  );
}
