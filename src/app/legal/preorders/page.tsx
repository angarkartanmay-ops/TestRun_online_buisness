import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { rules } from "@/lib/rules";

export const metadata: Metadata = { title: "Pre-orders, holds & refunds" };

export default function Page() {
  return (
    <LegalPage title="Pre-orders, holds & refunds" updated="October 2026">
      <p>Every QUORUM drop is a pre-order for goods that are made after the drop closes. This page explains exactly what happens to your money.</p>
      <h2>The hold</h2>
      <p>When you join, we place an authorisation (a &ldquo;hold&rdquo;) on your card for the drop&apos;s current price. A hold is not a charge. It is the most you can pay for that drop.</p>
      <h2>The charge</h2>
      <p>When the drop closes, if it reached its first tier, we charge every member the price of the highest tier the drop unlocked. That price is equal to or lower than your hold, and your bank releases the difference. If the drop did not reach its first tier, every hold is released and nobody is charged.</p>
      <h2>Leaving a drop</h2>
      <p>You can leave and release your hold at any time before the drop reaches its first tier, and within {rules.leaveGraceMinutes} minutes of joining. After that, your membership counts toward the price every other member pays, so it is locked until close.</p>
      <h2>Shipping</h2>
      <p>Each drop states a ship-by date before you join. If your item has not shipped by that date, we refund you in full automatically — you don&apos;t need to ask. If we learn of a delay before the date, we will email you with a revised date and the option to cancel for a full refund, as required by the FTC Mail, Internet, or Telephone Order Merchandise Rule.</p>
      <h2>Returns</h2>
      <p>You can return an item within 30 days of delivery for a refund of the price you paid, less a $4 inspection fee, which is shown on your receipt. Returned items in sellable condition are offered in the next drop of the same item.</p>
      <h2>Windows</h2>
      <p>Card holds expire after seven days, so no drop runs longer than {rules.maxWindowHours / 24} days.</p>
    </LegalPage>
  );
}
