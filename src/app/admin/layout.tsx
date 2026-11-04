import type { Metadata } from "next";
import { NavLink } from "@/components/nav-link";
import { requireAdmin } from "@/lib/admin";
import { modes } from "@/lib/config";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b-2 border-ink pb-3">
        <p className="display text-3xl">Local 001 · Admin</p>
        <nav aria-label="Admin" className="flex flex-wrap gap-1">
          <NavLink href="/admin/drops/new">New drop</NavLink>
          <NavLink href="/admin/hosts">Hosts</NavLink>
          <NavLink href="/admin/brands">Brands</NavLink>
          <NavLink href="/admin/wants">Wants</NavLink>
          <NavLink href="/admin/payouts">Payouts</NavLink>
          <NavLink href="/admin/emails">Email log</NavLink>
        </nav>
        <p className="label text-ink-3 ml-auto">
          payments: <b className={modes.payments === "stripe" ? "text-go" : "text-warn"}>{modes.payments === "commit" ? "pay after close" : modes.payments === "demo" ? "practice only" : "card holds"}</b> · email:{" "}
          <b className={modes.email === "resend" ? "text-go" : "text-warn"}>{modes.email}</b> · db: <b>{modes.database}</b>
        </p>
      </div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
