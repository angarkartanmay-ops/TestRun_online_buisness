import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { rules } from "@/lib/rules";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <LegalPage title="Terms" updated="November 2026">
      <p>These terms cover your use of QUORUM. By joining a drop you agree to them.</p>
      <h2>What QUORUM is</h2>
      <p>QUORUM groups orders from many members so that goods can be made at volume prices. On a house drop — most campus drops — QUORUM is the seller: we have it made to the stated specification and delivered. On a partner drop, the brand named on the drop is the seller and QUORUM runs the drop. Either way, QUORUM collects payment and enforces the bylaws published on this site.</p>
      <h2>Membership</h2>
      <p>Membership is free. You sign in with a one-time code sent to your email. One active spot per person per drop — bring friends instead of a second account.</p>
      <h2>Prices and fees</h2>
      <p>The price you pay is set by the drop&apos;s published price ladder and the number of members at close. Prices include GST and delivery. On a house drop, QUORUM&apos;s margin and the host&apos;s club-fund share ({rules.houseHostShareBps / 100}% by default) are lines on the published receipt, included in the price. On a partner drop, QUORUM&apos;s fee is {rules.feeBps / 100}% of the price, included in it, and hosts receive {rules.hostShareBps / 100}% out of it.</p>
      <h2>Payments, refunds and shipping</h2>
      <p>
        See <Link href="/legal/preorders" className="underline">Pre-orders &amp; refunds</Link> and <Link href="/legal/shipping-returns" className="underline">Shipping, sizes &amp; returns</Link>, which form part of these terms. Complaints: <Link href="/legal/grievance" className="underline">Contact &amp; grievances</Link>.
      </p>
      <h2>Hosts</h2>
      <p>Approved hosts earn the drop&apos;s published host share of the paid volume from members who joined through their link, paid after the drop ships. Self-referral, fake accounts or paid incentives to join are grounds for removal and forfeiture of unpaid earnings.</p>
      <h2>Liability</h2>
      <p>To the extent permitted by law, QUORUM&apos;s liability for any drop is limited to the amount you paid for it.</p>
    </LegalPage>
  );
}
