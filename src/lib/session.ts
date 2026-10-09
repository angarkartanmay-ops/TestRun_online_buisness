import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { userForToken } from "./auth";
import { config } from "./config";
import { getCtx } from "./server-ctx";

export const SESSION_COOKIE = "q_session";
export const CREW_COOKIE = "q_crew";

export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForToken(await getCtx(), token);
});

export const isAdmin = (email: string | undefined | null) =>
  Boolean(email && config.adminEmails.includes(email.toLowerCase()));

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
