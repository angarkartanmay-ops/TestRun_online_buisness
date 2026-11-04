import Link from "next/link";
import { brandForUser } from "@/lib/brands";
import { getCtx } from "@/lib/server-ctx";
import { getSessionUser, isAdmin } from "@/lib/session";
import { NavLink } from "./nav-link";

export async function SiteHeader() {
  const user = await getSessionUser();
  const brand = user ? await brandForUser(await getCtx(), user.id) : null;
  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 h-16 flex items-center gap-3 sm:gap-6">
        <Link href="/" className="flex items-baseline gap-2 shrink-0" aria-label="QUORUM home">
          <span className="display text-[1.75rem] sm:text-[2rem] leading-none tracking-tight">Quorum</span>
          <span className="label text-stamp hidden sm:inline">Local 001</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 sm:gap-2">
          <NavLink href="/drops">Drops</NavLink>
          <NavLink href="/wants">Wants</NavLink>
          <NavLink href="/receipts" desktopOnly>Receipts</NavLink>
          <NavLink href="/hosts" desktopOnly>Host</NavLink>
          {brand ? <NavLink href="/brand">Brand</NavLink> : null}
          {user && isAdmin(user.email) ? <NavLink href="/admin">Admin</NavLink> : null}
          {user ? (
            <Link href="/me" className="btn btn-sm ml-1">
              My drops
            </Link>
          ) : (
            <Link href="/sign-in" className="btn btn-sm btn-ghost ml-1">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
