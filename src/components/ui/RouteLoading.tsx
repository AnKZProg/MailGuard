/**
 * Every route segment's loading.tsx renders this. Without a loading.tsx,
 * Next.js blocks the visible transition until the next route's Server
 * Component finishes all its queries. A skeleton in the page's real shape
 * (header + list) reads as "already here, filling in" instead of a spinner's
 * "something is happening somewhere".
 */
const ROW_WIDTHS = ["w-3/5", "w-2/5", "w-4/5", "w-1/2", "w-3/4", "w-2/5", "w-3/5", "w-1/2", "w-4/5"];

export function RouteLoading() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden" aria-busy="true" aria-label="Chargement">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border-subtle px-4">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
        <div className="h-8 flex-1 animate-pulse rounded-md bg-surface-1" />
      </div>
      <div className="flex flex-col">
        {ROW_WIDTHS.map((width, i) => (
          <div key={i} className="flex gap-3 border-b border-border-subtle py-3 pl-5 pr-4">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-2" />
            <div className="flex flex-1 flex-col gap-2 pt-0.5">
              <div className="h-3 w-32 animate-pulse rounded bg-surface-2" />
              <div className={`h-3 ${width} animate-pulse rounded bg-surface-1`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
