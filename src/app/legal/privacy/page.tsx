import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function Page() {
  return (
    <LegalPage title="Privacy" updated="October 2026">
      <p>We collect as little as the product needs, and we say exactly what it is.</p>
      <h2>What we store</h2>
      <p>Your email address; a random crew code; the drops you join and what you were held and charged; who referred you (by crew code); and a session token in a cookie so you stay signed in. Sign-in codes are stored only as a keyed hash and expire after ten minutes.</p>
      <h2>What we don&apos;t</h2>
      <p>Card and bank details never touch our servers — UPI payments happen in your own UPI app, and card payments go directly to our payment processor (Razorpay in India, Stripe elsewhere). We store your email, the size you picked and what you paid. We don&apos;t read your group chats, run ad trackers, or sell or share your data with advertisers.</p>
      <h2>What other members see</h2>
      <p>Drop pages show counts and anonymous activity (&ldquo;Joined from a crew link&rdquo;). Your email and name are never shown to other members. Hosts see how many members joined from their link, not who.</p>
      <h2>Cookies</h2>
      <p>One session cookie when you&apos;re signed in, and one cookie for a week remembering which crew link you arrived from. Your theme choice is kept in your browser&apos;s local storage.</p>
      <h2>Deleting your data</h2>
      <p>Email us from your account address and we&apos;ll delete your account and pledge history, except records we must keep for payment and tax law.</p>
    </LegalPage>
  );
}
