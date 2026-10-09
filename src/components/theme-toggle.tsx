"use client";

import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type Choice = "system" | "light" | "dark";
const OPTIONS: { value: Choice; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match system", Icon: Desktop },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") setChoice(t);
  }, []);

  function pick(next: Choice) {
    setChoice(next);
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (next === "system") localStorage.removeItem("q-theme");
      else localStorage.setItem("q-theme", next);
    } catch {
      /* private mode: the choice still applies for this visit */
    }
  }

  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex border border-line">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => pick(value)}
          className={`h-9 w-10 grid place-items-center transition-colors ${
            choice === value ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"
          }`}
        >
          <Icon size={16} weight={choice === value ? "fill" : "regular"} />
        </button>
      ))}
    </div>
  );
}
