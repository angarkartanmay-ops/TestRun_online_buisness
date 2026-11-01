import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Shipping, sizes & returns" };

export default function Page() {
  return (
    <LegalPage title="Shipping, sizes & returns" updated="November 2026">
      <p>Everything on QUORUM is made to order for the group that bought it. That&apos;s why there&apos;s no spare stock — and it shapes what returns look like.</p>
      <h2>Delivery</h2>
      <p>Campus drops ship in one parcel to the host, who hands them out — usually at a club stall or the department. Drops printed on demand ship to each member&apos;s address. Either way, delivery is included in the price you see. Each drop prints its ship-by date before you join.</p>
      <h2>Late delivery</h2>
      <p>If a drop hasn&apos;t shipped by its ship-by date, every member who paid gets a full refund automatically. If we know about a delay earlier, we email you with a new date and the choice to cancel for a full refund.</p>
      <h2>Sizes</h2>
      <p>You pick your size when you join, from the sizes listed on the drop. If it doesn&apos;t fit, tell us within 7 days of delivery, unworn and unwashed, and we&apos;ll exchange it for another size once — we cover the reprint and the courier.</p>
      <h2>Defects and misprints</h2>
      <p>If your item arrives damaged, misprinted or not as described, send a photo within 7 days of delivery. We replace it, or refund you in full if a replacement isn&apos;t possible.</p>
      <h2>Change of mind</h2>
      <p>Because each item is made for your group, we don&apos;t accept change-of-mind returns once a drop has closed. Before it closes you can leave as described in <Link href="/legal/preorders" className="underline">Pre-orders, payment &amp; refunds</Link>.</p>
      <h2>Refunds</h2>
      <p>Refunds go back to the account you paid from, by UPI or to your original payment method, within 7 working days of approval.</p>
      <h2>Questions and complaints</h2>
      <p>See <Link href="/legal/grievance" className="underline">Contact &amp; grievances</Link>.</p>
    </LegalPage>
  );
}
