"use client";

import { Check } from "@phosphor-icons/react";
import { useState } from "react";
import { ApiError, post } from "@/lib/api-client";

/** "I've paid" — tells the organiser to check for the UPI payment. It doesn't mark you paid by itself. */
export function ClaimPaidButton({ pledgeId, claimed }: { pledgeId: string; claimed: boolean }) {
  const [done, setDone] = useState(claimed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (done) {
    return (
      <p className="text-sm text-go flex items-center gap-1.5" role="status">
        <Check weight="bold" size={16} /> Thanks — we&apos;ll confirm once the payment shows up.
      </p>
    );
  }
  return (
    <div className="grid gap-1">
      <button
        type="button"
        className="btn btn-sm btn-ghost justify-self-start"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await post(`/api/pledges/${pledgeId}/paid`);
            setDone(true);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Couldn't send that. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Sending…" : "I've paid"}
      </button>
      {error ? <p role="alert" className="text-sm text-stamp">{error}</p> : null}
    </div>
  );
}
