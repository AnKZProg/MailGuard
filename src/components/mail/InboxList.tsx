"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { quarantineNow, restoreNow, trashNow } from "@/app/actions/message-actions";
import type { InboxRow } from "@/lib/queries/inbox-rows";
import { SenderAvatar } from "./SenderAvatar";
import { VerdictBadge } from "./VerdictBadge";
import { KeyboardHelp } from "./KeyboardHelp";

type Props = {
  rows: InboxRow[];
  openId?: string;
  closeHref: string;
  loadMoreHref: string | null;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function InboxList({ rows, openId, closeHref, loadMoreHref }: Props) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [cursorId, setCursorId] = useState<string | undefined>(openId);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prevOpenId, setPrevOpenId] = useState(openId);

  // Opening a message (click, URL, Enter) moves the keyboard cursor onto it.
  if (openId !== prevOpenId) {
    setPrevOpenId(openId);
    if (openId) setCursorId(openId);
  }

  const visible = useMemo(() => rows.filter((r) => !hidden.has(r.id)), [rows, hidden]);
  const cursorIndex = visible.findIndex((r) => r.id === cursorId);

  const hide = (id: string, isHidden: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (isHidden) next.add(id);
      else next.delete(id);
      return next;
    });

  /** After removing `id`, keep the reader moving forward instead of bouncing to the top. */
  const advancePast = useCallback(
    (id: string) => {
      const index = visible.findIndex((r) => r.id === id);
      const next = visible[index + 1] ?? visible[index - 1];
      setCursorId(next?.id);
      if (id === openId) router.push(next ? next.href : closeHref);
    },
    [visible, openId, router, closeHref],
  );

  const quarantine = useCallback(
    async (row: InboxRow) => {
      hide(row.id, true);
      advancePast(row.id);
      try {
        await quarantineNow(row.id);
        toast.success("Mis en quarantaine", {
          description: row.subject || "(sans objet)",
          action: {
            label: "Annuler",
            onClick: async () => {
              await restoreNow(row.id);
              hide(row.id, false);
              router.refresh();
            },
          },
        });
      } catch {
        hide(row.id, false);
        toast.error("Impossible de mettre ce mail en quarantaine.");
      }
    },
    [advancePast, router],
  );

  const trash = useCallback(
    async (row: InboxRow) => {
      hide(row.id, true);
      advancePast(row.id);
      try {
        await trashNow(row.id);
        toast.success("Mis à la corbeille", { description: "Récupérable depuis la corbeille de ta boîte mail." });
      } catch {
        hide(row.id, false);
        toast.error("Impossible de mettre ce mail à la corbeille.");
      }
    },
    [advancePast],
  );

  useEffect(() => {
    function select(index: number) {
      const row = visible[Math.max(0, Math.min(visible.length - 1, index))];
      if (!row) return;
      setCursorId(row.id);
      document.querySelector(`[data-row-id="${row.id}"]`)?.scrollIntoView({ block: "nearest" });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      const current = visible[cursorIndex];
      switch (event.key) {
        case "j":
        case "ArrowDown":
          select(cursorIndex + 1);
          break;
        case "k":
        case "ArrowUp":
          select(cursorIndex < 0 ? 0 : cursorIndex - 1);
          break;
        case "Enter":
        case "o":
          if (current) router.push(current.href);
          break;
        case "Escape":
          if (helpOpen) setHelpOpen(false);
          else if (openId) router.push(closeHref);
          else return;
          break;
        case "e":
          if (current) void quarantine(current);
          break;
        case "#":
        case "Delete":
          if (current) void trash(current);
          break;
        case "/":
          document.getElementById("inbox-search")?.focus();
          break;
        case "?":
          setHelpOpen((open) => !open);
          break;
        default:
          return;
      }
      event.preventDefault();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, cursorIndex, openId, closeHref, helpOpen, router, quarantine, trash]);

  return (
    <>
      <div role="listbox" aria-label="Messages" className="flex flex-col pb-6">
        {visible.map((row, i) => {
          const showGroup = i === 0 || visible[i - 1].group !== row.group;
          const isOpen = row.id === openId;
          const isCursor = row.id === cursorId;
          return (
            <div key={row.id}>
              {showGroup && (
                <div className="sticky top-0 z-10 border-b border-border-subtle bg-surface-0/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary backdrop-blur">
                  {row.group}
                </div>
              )}
              <div data-row-id={row.id} className="group relative">
                <Link
                  href={row.href}
                  role="option"
                  aria-selected={isOpen}
                  onClick={() => setCursorId(row.id)}
                  className={cn(
                    "flex gap-3 border-b border-border-subtle py-2.5 pl-2 pr-4 transition-colors",
                    isOpen ? "bg-row-selected shadow-[inset_2px_0_0_var(--accent)]" : "hover:bg-surface-1",
                    isCursor && !isOpen && "bg-surface-1 shadow-[inset_2px_0_0_var(--border-default)]",
                  )}
                >
                  <span
                    className={cn("mt-[13px] h-1.5 w-1.5 shrink-0 rounded-full", row.isRead ? "bg-transparent" : "bg-unread")}
                    aria-label={row.isRead ? undefined : "Non lu"}
                  />
                  <SenderAvatar name={row.senderName} address={row.senderAddress} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-[13px]",
                          row.isRead ? "text-text-secondary" : "font-semibold text-text-primary",
                        )}
                      >
                        {row.senderName || row.senderAddress}
                      </span>
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: row.accountColorVar }}
                        title={row.accountEmail}
                      />
                      <time
                        title={row.dateTitle}
                        className={cn(
                          "ml-auto shrink-0 text-[11.5px] tabular-nums group-hover:invisible",
                          row.isRead ? "text-text-tertiary" : "font-medium text-text-secondary",
                        )}
                      >
                        {row.dateLabel}
                      </time>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-[12.5px] leading-5">
                        <span className={row.isRead ? "text-text-secondary" : "font-medium text-text-primary"}>
                          {row.subject || "(sans objet)"}
                        </span>
                        {row.snippet && <span className="text-text-tertiary"> — {row.snippet}</span>}
                      </p>
                      {row.verdict && row.verdict !== "LEGITIMATE" && <VerdictBadge verdict={row.verdict} />}
                    </div>
                  </div>
                </Link>
                <div className="absolute right-3 top-1.5 hidden items-center gap-0.5 rounded-md border border-border-subtle bg-surface-0 p-0.5 shadow-[var(--elevation-sm)] group-hover:flex">
                  <RowAction label="Quarantaine (e)" onClick={() => quarantine(row)} tone="newsletter">
                    <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </RowAction>
                  <RowAction label="Corbeille (#)" onClick={() => trash(row)} tone="phishing">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </RowAction>
                </div>
              </div>
            </div>
          );
        })}
        {loadMoreHref && (
          <Link
            href={loadMoreHref}
            className="mx-4 mt-4 rounded-md border border-border-subtle py-2 text-center text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"
          >
            Charger plus
          </Link>
        )}
      </div>
      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

function RowAction({
  label,
  onClick,
  tone,
  children,
}: {
  label: string;
  onClick: () => void;
  tone: "newsletter" | "phishing";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded text-text-tertiary transition-colors",
        tone === "newsletter"
          ? "hover:bg-verdict-newsletter-soft hover:text-verdict-newsletter"
          : "hover:bg-verdict-phishing-soft hover:text-verdict-phishing",
      )}
    >
      {children}
    </button>
  );
}
