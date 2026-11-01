import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Contact & grievances" };

/**
 * The Consumer Protection (E-Commerce) Rules, 2020 require the seller's name and
 * address and a named grievance officer who acknowledges complaints within 48
 * hours and resolves them within a month. Set SELLER_NAME, SELLER_ADDRESS,
 * GRIEVANCE_NAME and GRIEVANCE_EMAIL before the first paid drop.
 */
export default function Page() {
  const ready = Boolean(config.grievanceName && config.grievanceEmail);
  return (
    <LegalPage title="Contact & grievances" updated="November 2026">
      <p>If something went wrong with a drop — a payment, a size, a late or damaged order — write to us. A person reads every message.</p>
      <h2>Seller</h2>
      {config.sellerName ? (
        <p>
          {config.sellerName}
          {config.sellerAddress ? (
            <>
              <br />
              {config.sellerAddress}
            </>
          ) : null}
        </p>
      ) : (
        <p>QUORUM is in its practice phase and not yet selling. The seller&apos;s name and address will be listed here before the first paid drop opens.</p>
      )}
      <h2>Grievance officer</h2>
      {ready ? (
        <p>
          {config.grievanceName}
          <br />
          <a className="underline" href={`mailto:${config.grievanceEmail}`}>
            {config.grievanceEmail}
          </a>
        </p>
      ) : (
        <p>The grievance officer&apos;s name and contact will be listed here before the first paid drop opens.</p>
      )}
      <h2>What happens next</h2>
      <p>We acknowledge every complaint within 48 hours and resolve it within one month of receiving it. Tell us the drop, your size and, for a payment, the UPI note (it starts with QRM-).</p>
    </LegalPage>
  );
}
