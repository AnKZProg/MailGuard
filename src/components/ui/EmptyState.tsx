import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
};

export function EmptyState({ icon: Icon, title, description, actionHref, actionLabel }: Props) {
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-subtle bg-surface-1">
        <Icon className="h-5 w-5 text-text-tertiary" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-[14px] font-semibold text-text-primary">{title}</h2>
        <p className="text-[13px] leading-relaxed text-text-secondary">{description}</p>
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex h-8 items-center rounded-md bg-accent px-3.5 text-[13px] font-medium text-accent-contrast transition-colors hover:bg-accent-strong"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
