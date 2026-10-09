import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const COLS: { title: string; links: [string, string][] }[] = [
  { title: "The union", links: [["Open drops", "/drops"], ["Published receipts", "/receipts"], ["Bylaws", "/#bylaws"], ["My drops", "/me"]] },
  { title: "Build with us", links: [["Host a drop", "/hosts"], ["Brands: run a drop", "/brands"], ["Host dashboard", "/me/host"]] },
  { title: "Small print", links: [["Pre-orders & refunds", "/legal/preorders"], ["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"]] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8 py-14 grid gap-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="space-y-4">
          <p className="display text-5xl">Quorum</p>
          <p className="text-ink-2 max-w-[30ch]">A buyers&apos; union for people who were already deciding together.</p>
          <ThemeToggle />
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <p className="label text-ink-3 mb-4">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-2 hover:text-stamp transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="label text-ink-3 mx-auto max-w-[1320px] px-4 sm:px-8 py-5 flex flex-wrap gap-x-6 gap-y-2">
          <span>The price only falls</span>
          <span>The factory is always named</span>
          <span>Our 8% is always shown</span>
        </p>
      </div>
    </footer>
  );
}
