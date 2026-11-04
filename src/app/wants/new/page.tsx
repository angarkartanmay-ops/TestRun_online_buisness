import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WantForm } from "@/components/want-form";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Ask for something" };

export default async function NewWant() {
  if (!(await getSessionUser())) redirect("/sign-in?next=/wants/new");
  return (
    <div className="mx-auto max-w-[640px] px-4 sm:px-8 pt-10 sm:pt-14">
      <p className="label text-ink-2">Demand board</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">What would you buy?</h1>
      <p className="mt-4 text-ink-2">No payment, no commitment. We count how many people want it and share the numbers with the brand.</p>
      <div className="mt-8 bg-receipt border-2 border-ink p-6 sm:p-8 shadow-[8px_8px_0_var(--shadow)]">
        <WantForm />
      </div>
    </div>
  );
}
