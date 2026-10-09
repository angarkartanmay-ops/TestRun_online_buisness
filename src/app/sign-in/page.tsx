import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { SignInPanel } from "./sign-in-panel";

export const metadata: Metadata = { title: "Sign in" };

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/me");

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-14 sm:pt-24 grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <p className="label text-ink-2">Member card</p>
        <h1 className="display text-6xl sm:text-8xl mt-2">One code. No password.</h1>
        <p className="mt-5 text-lg text-ink-2 max-w-[46ch]">
          Membership is free and always will be. Your card gets you the board, your holds, your crew link — and one email when a drop you&apos;re in drops its price.
        </p>
      </div>
      <div className="lg:col-span-5 lg:col-start-8 bg-receipt border-2 border-ink p-6 sm:p-8 shadow-[8px_8px_0_var(--shadow)] self-start">
        <SignInPanel next={next} />
      </div>
    </div>
  );
}
