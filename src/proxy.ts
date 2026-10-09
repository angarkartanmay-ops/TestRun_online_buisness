import { NextResponse, type NextRequest } from "next/server";

/**
 * Crew attribution. A shared link carries ?c=<crew code>; remember it for a week
 * so the join still credits the friend who sent it, even if the person browses
 * around first. The code is validated server-side at join time.
 */
export function proxy(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("c");
  const res = NextResponse.next();
  if (code && /^[a-z0-9]{4,12}$/i.test(code)) {
    res.cookies.set("q_crew", code.toLowerCase(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 86400,
    });
  }
  return res;
}

export const config = { matcher: ["/drops/:path*", "/"] };
