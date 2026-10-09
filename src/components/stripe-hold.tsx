"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
// The `pure` entry injects Stripe.js only when loadStripe() runs — not on import.
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Appearance, Stripe } from "@stripe/stripe-js";
import { Lock } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (key: string) => (stripePromise ??= loadStripe(key));

function appearance(): Appearance {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    theme: "flat",
    variables: {
      colorPrimary: v("--stamp"),
      colorBackground: v("--receipt"),
      colorText: v("--ink"),
      colorTextSecondary: v("--ink-2"),
      colorDanger: v("--stamp"),
      borderRadius: "2px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    },
    rules: { ".Input": { border: `2px solid ${v("--ink")}` }, ".Label": { textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "11px" } },
  };
}

/** Stripe's card form for a manual-capture hold. Never charges — only authorises. */
export function StripeHold(props: { publishableKey: string; clientSecret: string; holdLabel: string; onHeld: () => Promise<void> }) {
  const options = useMemo(() => ({ clientSecret: props.clientSecret, appearance: appearance() }), [props.clientSecret]);
  return (
    <Elements stripe={getStripe(props.publishableKey)} options={options}>
      <HoldForm holdLabel={props.holdLabel} onHeld={props.onHeld} />
    </Elements>
  );
}

function HoldForm({ holdLabel, onHeld }: { holdLabel: string; onHeld: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (err) {
      setError(err.message ?? "Your card was declined. Nothing was held.");
      setBusy(false);
      return;
    }
    await onHeld();
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <PaymentElement options={{ layout: "tabs" }} />
      {error ? (
        <p role="alert" className="text-sm text-stamp">
          {error}
        </p>
      ) : null}
      <button className="btn btn-stamp w-full" disabled={!stripe || busy}>
        <Lock weight="bold" size={18} /> {busy ? "Placing hold…" : `Place ${holdLabel} hold`}
      </button>
      <p className="text-xs text-ink-3">
        This is an authorisation, not a charge. At close we charge the final price — equal or lower — and your bank releases the rest.
      </p>
    </form>
  );
}
