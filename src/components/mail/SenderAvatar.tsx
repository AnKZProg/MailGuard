import { cn } from "@/lib/cn";

type Props = {
  name: string | null;
  address: string;
  size?: "sm" | "lg";
  className?: string;
};

/** Deterministic hue so a sender keeps the same color everywhere — no remote favicon/Gravatar fetch (privacy). */
function hueOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function initialsOf(name: string | null, address: string): string {
  const source = (name ?? "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim() || address.split("@")[0];
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0][0] + words[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function SenderAvatar({ name, address, size = "sm", className }: Props) {
  const hue = hueOf(address.toLowerCase());
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight",
        size === "sm" ? "h-8 w-8 text-[11px]" : "h-10 w-10 text-[13px]",
        className,
      )}
      style={{
        backgroundColor: `oklch(var(--avatar-bg-l) var(--avatar-bg-c) ${hue})`,
        color: `oklch(var(--avatar-fg-l) var(--avatar-fg-c) ${hue})`,
      }}
    >
      {initialsOf(name, address)}
    </span>
  );
}
