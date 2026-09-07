"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Silently re-syncs every account in the background so new mail shows up without
 * needing the manual "Synchroniser" button. Mounted once in the root layout.
 */
export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/sync", { method: "POST" })
        .then((res) => {
          if (!res.ok) throw new Error("auto_sync_failed");
          router.refresh();
        })
        .catch((err) => console.error("[auto-sync]", err));
    }, AUTO_SYNC_INTERVAL_MS);

    return () => clearInterval(id);
  }, [router]);

  return null;
}
