import { cookies } from "next/headers";

type FlowCookiePayload = {
  state: string;
  codeVerifier: string;
};

const COOKIE_NAME = "mailguard_oauth_flow";
const MAX_AGE_SECONDS = 10 * 60;

export async function setFlowCookie(provider: "google" | "microsoft", payload: FlowCookiePayload): Promise<void> {
  const store = await cookies();
  store.set(`${COOKIE_NAME}_${provider}`, JSON.stringify(payload), {
    httpOnly: true,
    secure: false, // localhost-only app, served over http
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function consumeFlowCookie(provider: "google" | "microsoft"): Promise<FlowCookiePayload | undefined> {
  const store = await cookies();
  const name = `${COOKIE_NAME}_${provider}`;
  const raw = store.get(name)?.value;
  store.delete(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as FlowCookiePayload;
    if (typeof parsed.state !== "string" || typeof parsed.codeVerifier !== "string") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
