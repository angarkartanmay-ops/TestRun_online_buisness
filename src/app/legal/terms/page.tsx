import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { rules } from "@/lib/rules";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <LegalPage title="Terms" updated="October 2026">
      <p>These terms cover your use of QUORUM. By joining a drop you agree to them.</p>
      <h2>What QUORUM is</h2>
      <p>QUORUM is a marketplace that groups orders from many members so that independent brands can make and sell goods at volume prices. The brand named on each drop is the seller of the goods and is responsible for making them to the stated specification. QUORUM operates the drop, holds and charges payments, and enforces the bylaws published on this site.</p>
      <h2>Membership</h2>
      <p>Membership is free. You sign in with a one-time code sent to your email. One active pledge per person per drop — bring friends instead of a second card.</p>
      <h2>Prices and fees</h2>
      <p>The price you pay is set by the drop&apos;s published price ladder and the number of members at close. QUORUM&apos;s fee is {rules.feeBps / 100}% of the price and is included in it, not added on top. Hosts receive {rules.hostShareBps / 100}% out of QUORUM&apos;s fee.</p>
      <h2>Payments, refunds and shipping</h2>
      <p>See <Link href="/legal/preorders" className="underline">Pre-orders, holds &amp; refunds</Link>, which forms part of these terms.</p>
      <h2>Hosts</h2>
      <p>Approved hosts earn {rules.hostShareBps / 100}% of the cleared volume from members who joined through their link, paid after the drop ships. Self-referral, fake accounts or paid incentives to join are grounds for removal and forfeiture of unpaid earnings.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, QUORUM&apos;s liability for any drop is limited to the amount you paid for it.</p>
    </LegalPage>
  );
}
