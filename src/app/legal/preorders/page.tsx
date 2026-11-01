import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";
import { payStyle } from "@/lib/config";
import { rules } from "@/lib/rules";

export const metadata: Metadata = { title: payStyle === "card" ? "Pre-orders, holds & refunds" : "Pre-orders, payment & refunds" };

export default function Page() {
  if (payStyle === "card") {
    return (
      <LegalPage title="Pre-orders, holds & refunds" updated="November 2026">
        <p>Every QUORUM drop is a pre-order for goods that are made after the drop closes. This page explains exactly what happens to your money.</p>
        <h2>The hold</h2>
        <p>When you join, we place an authorisation (a &ldquo;hold&rdquo;) on your card for the drop&apos;s current price. A hold is not a charge. It is the most you can pay for that drop.</p>
        <h2>The charge</h2>
        <p>When the drop closes, if it reached its first tier, we charge every member the price of the highest tier the drop unlocked. That price is equal to or lower than your hold, and your bank releases the difference. If the drop did not reach its first tier, every hold is released and nobody is charged.</p>
        <h2>Leaving a drop</h2>
        <p>You can leave and release your hold at any time before the drop reaches its first tier, and within {rules.leaveGraceMinutes} minutes of joining. After that, your membership counts toward the price every other member pays, so it is locked until close.</p>
        <h2>Shipping and returns</h2>
        <p>Each drop states a ship-by date before you join. If your item has not shipped by that date, we refund you in full automatically. See <Link href="/legal/shipping-returns" className="underline">Shipping, sizes &amp; returns</Link>.</p>
        <h2>Windows</h2>
        <p>Card holds expire after seven days, so no drop runs longer than {rules.maxWindowHours / 24} days.</p>
      </LegalPage>
    );
  }
  return (
    <LegalPage title="Pre-orders, payment & refunds" updated="November 2026">
      <p>Every QUORUM drop is a pre-order for goods that are made after the drop closes. This page explains exactly when money moves — which is only ever after a drop closes.</p>
      <h2>Joining is a promise</h2>
      <p>When you join, you promise to buy at the drop&apos;s final price, and you pick your size. Nothing is paid and no money is blocked. The price shown when you join is the most you can pay: it can only fall as more people join.</p>
      <h2>Paying</h2>
      <p>When the drop closes, if it reached its first tier, every member pays the same final price — the price of the highest tier the group unlocked, whenever they joined. You get one payment link (UPI, or a card or UPI payment page) by email and on your account page, and have {rules.payWindowHours} hours to pay. The price includes GST and delivery; there are no fees at checkout.</p>
      <h2>If a drop doesn&apos;t clear</h2>
      <p>If the drop doesn&apos;t reach its first tier, nothing is made and nobody pays. Because no money moved, there is nothing to refund.</p>
      <h2>If you don&apos;t pay</h2>
      <p>If you haven&apos;t paid by the deadline, your spot is released and nothing is made for you. The price stays where the group put it — it doesn&apos;t rise for everyone else.</p>
      <h2>Leaving a drop</h2>
      <p>You can leave freely before the drop reaches its first tier, and within {rules.leaveGraceMinutes} minutes of joining. After that your spot counts toward the price every other member pays, so it is locked until close.</p>
      <h2>Shipping, sizes and returns</h2>
      <p>Each drop states a ship-by date before you join. If your order hasn&apos;t shipped by that date, everyone who paid is refunded in full without asking. Sizes, exchanges, defects and refunds are covered in <Link href="/legal/shipping-returns" className="underline">Shipping, sizes &amp; returns</Link>.</p>
      <h2>Practice drops</h2>
      <p>Drops labelled &ldquo;Practice&rdquo; show how the mechanic works. Their other members are simulated, nothing is made, and nobody ever pays for them.</p>
    </LegalPage>
  );
}
