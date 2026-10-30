"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format/relative-time";

const TICK_MS = 30_000;

/** Ticks on its own: the layout (and so this prop) isn't re-rendered on every client navigation. */
export function LastSync({ at }: { at: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (!at) return <span>Jamais synchronisé</span>;
  return <span suppressHydrationWarning>Synchronisé {relativeTime(new Date(at), now)}</span>;
}
