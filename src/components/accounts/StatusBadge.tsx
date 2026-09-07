import { cn } from "@/lib/cn";

const STYLE: Record<"ACTIVE" | "NEEDS_RECONSENT" | "ERROR", { label: string; className: string }> = {
  ACTIVE: { label: "Actif", className: "bg-verdict-legitimate-soft text-verdict-legitimate" },
  NEEDS_RECONSENT: { label: "Reconnexion requise", className: "bg-verdict-newsletter-soft text-verdict-newsletter" },
  ERROR: { label: "Erreur", className: "bg-verdict-phishing-soft text-verdict-phishing" },
};

type Props = {
  status: "ACTIVE" | "NEEDS_RECONSENT" | "ERROR";
};

export function StatusBadge({ status }: Props) {
  const { label, className } = STYLE[status];
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium", className)}>
      {label}
    </span>
  );
}
