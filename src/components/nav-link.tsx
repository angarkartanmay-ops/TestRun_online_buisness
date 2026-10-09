"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * `desktopOnly` is a prop rather than a passed-in `hidden` class: the base style
 * sets `inline-flex`, and two competing display utilities resolve by stylesheet
 * order, not by which one you meant.
 */
export function NavLink({ href, children, desktopOnly = false }: { href: string; children: React.ReactNode; desktopOnly?: boolean }) {
  const path = usePathname();
  const active = path === href || path.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`label ${desktopOnly ? "hidden sm:inline-flex" : "inline-flex"} items-center h-9 px-2 border-b-2 transition-colors ${
        active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink hover:border-stamp"
      }`}
    >
      {children}
    </Link>
  );
}
