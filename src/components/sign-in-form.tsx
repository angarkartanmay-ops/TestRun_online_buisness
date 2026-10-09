"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { ApiError, post } from "@/lib/api-client";

/**
 * Email → 6-digit code, inline. No password, no redirect to an inbox link that
 * opens in the wrong browser — the code is typed where you already are.
 */
export function SignInForm({ onSignedIn, cta = "Send my code" }: { onSignedIn: (user: { crewCode: string }) => void | Promise<void>; cta?: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ devCode?: string }>("/api/auth/code", { email });
      setDevCode(r.devCode ?? null);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ user: { crewCode: string } }>("/api/auth/verify", { email, code });
      await onSignedIn(r.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't check the code.");
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="grid gap-2" noValidate>
        <label htmlFor="signin-email" className="label text-ink-2">
          Email
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="signin-email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@wherever.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "signin-error" : "signin-help"}
          />
          <button className="btn btn-stamp shrink-0" disabled={busy || !email}>
            {busy ? "Sending…" : cta} <ArrowRight weight="bold" size={18} />
          </button>
        </div>
        {error ? (
          <p id="signin-error" role="alert" className="text-sm text-stamp">
            {error}
          </p>
        ) : (
          <p id="signin-help" className="text-sm text-ink-3">
            We&apos;ll email a 6-digit code. No password, no newsletter.
          </p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="grid gap-2" noValidate>
      <label htmlFor="signin-code" className="label text-ink-2">
        Code sent to {email}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          ref={codeRef}
          id="signin-code"
          className="field tracking-[0.5em] text-center text-xl"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          placeholder="••••••"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "signin-error" : undefined}
        />
        <button className="btn btn-stamp shrink-0" disabled={busy || code.length !== 6}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </div>
      {devCode ? (
        <p className="text-sm bg-stamp-soft text-ink px-3 py-2 border border-stamp/40">
          <span className="label text-stamp">Preview server</span> Email isn&apos;t connected here, so your code is{" "}
          <button type="button" className="font-mono font-bold underline" onClick={() => setCode(devCode)}>
            {devCode}
          </button>
          .
        </p>
      ) : null}
      {error ? (
        <p id="signin-error" role="alert" className="text-sm text-stamp">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-ink-3">
        <button type="button" className="underline hover:text-ink" onClick={() => sendCode()} disabled={busy}>
          Send a new code
        </button>{" "}
        ·{" "}
        <button
          type="button"
          className="underline hover:text-ink"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </p>
    </form>
  );
}
