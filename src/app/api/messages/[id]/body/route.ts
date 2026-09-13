import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getValidAccessToken } from "@/lib/providers/token-manager";
import { getMessageBody as getGmailBody } from "@/lib/providers/google/gmail-client";
import { getMessageBody as getGraphBody } from "@/lib/providers/microsoft/graph-client";
import { isSameOriginRequest } from "@/lib/http/same-origin";

export async function GET(request: Request, context: RouteContext<"/api/messages/[id]/body">) {
  // A cross-origin page could otherwise trigger this via <img>/fetch, causing
  // a real Gmail/Graph API call (quota/log noise) purely from another open
  // tab — same class of check /api/sync already has, applied consistently.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "cross_origin_forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const message = await db.message.findUnique({ where: { id }, include: { account: true } });
  if (!message) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const accessToken = await getValidAccessToken(message.accountId);
    const body =
      message.account.provider === "GOOGLE"
        ? await getGmailBody(accessToken, message.providerMessageId)
        : await getGraphBody(accessToken, message.providerMessageId);
    return NextResponse.json(body);
  } catch (err) {
    console.error("[messages/body]", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
