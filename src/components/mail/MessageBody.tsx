"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Body = { contentType: "text" | "html"; content: string };
type State = { kind: "loading" } | { kind: "error"; message: string } | { kind: "loaded"; body: Body };

/**
 * Renders a message body fetched on demand. HTML is shown in a fully sandboxed
 * iframe (`sandbox=""` — no scripts, no forms, no top-navigation, no same-origin
 * access) so nothing in the mail can run, and a strict inline CSP blocks remote
 * image loading (anti tracking-pixel). Links become inert automatically: a fully
 * sandboxed frame cannot navigate anywhere on click.
 *
 * Rendered with `key={messageId}` by its caller so a new message remounts this
 * component fresh instead of needing an in-effect state reset.
 */
export function MessageBody({ messageId }: { messageId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/messages/${messageId}/body`)
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((body: Body) => {
        if (!cancelled) setState({ kind: "loaded", body });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error", message: "Impossible de charger le contenu du message." });
      });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  if (state.kind === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
      </div>
    );
  }

  if (state.kind === "error") {
    return <p className="p-4 text-[13px] text-text-tertiary">{state.message}</p>;
  }

  if (state.body.contentType === "text") {
    return (
      <pre className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-text-primary">
        {state.body.content}
      </pre>
    );
  }

  const doc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:;"><base target="_blank">${state.body.content}`;

  return <iframe title="Contenu du message" sandbox="" srcDoc={doc} className="flex-1 border-0 bg-white" />;
}
