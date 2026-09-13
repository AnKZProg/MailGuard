import { Loader2 } from "lucide-react";

/**
 * Every route segment's loading.tsx renders this. Without a loading.tsx,
 * Next.js blocks the visible transition until the next route's Server
 * Component finishes all its queries — the sidebar/header freeze with no
 * feedback, which reads as a full page load even though no browser
 * navigation actually happened. This gives App Router something to show
 * instantly (wrapped in a Suspense boundary automatically) while the real
 * page streams in behind it.
 */
export function RouteLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-text-tertiary">
      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
    </div>
  );
}
