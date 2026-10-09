"use client";

import { useEffect, useState } from "react";
import { fmtRemaining } from "@/lib/format";

/** Ticks every second; renders the server's value first so there's no layout shift. */
export function Countdown({ closesAt, initial, className = "" }: { closesAt: string; initial: string; className?: string }) {
  const [text, setText] = useState(initial);
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    const end = new Date(closesAt).getTime();
    const tick = () => {
      const left = end - Date.now();
      setText(fmtRemaining(left));
      setUrgent(left > 0 && left < 12 * 3600_000);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [closesAt]);
  return (
    <time dateTime={closesAt} className={`num ${urgent ? "text-stamp" : ""} ${className}`} suppressHydrationWarning>
      {text}
    </time>
  );
}
