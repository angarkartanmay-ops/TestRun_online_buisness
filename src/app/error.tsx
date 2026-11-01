"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-20 pb-10 grid gap-6 justify-items-start">
      <span className="stamp stamp-hot text-sm">Out of order</span>
      <h1 className="display text-7xl">Something broke on our side.</h1>
      <p className="text-lg text-ink-2 max-w-[48ch]">Nothing was charged. Money only moves when a drop closes, and that runs separately from this page.</p>
      <button type="button" onClick={reset} className="btn">
        Try again
      </button>
    </div>
  );
}
