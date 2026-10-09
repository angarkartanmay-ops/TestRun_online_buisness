import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-20 pb-10 grid gap-6 justify-items-start">
      <span className="stamp stamp-mute text-sm">Missed quorum</span>
      <h1 className="display text-7xl sm:text-9xl">Nothing here.</h1>
      <p className="text-lg text-ink-2 max-w-[44ch]">That page doesn&apos;t exist — or it was a drop that never opened. The board has everything that&apos;s live.</p>
      <Link href="/drops" className="btn btn-stamp">
        Open drops
      </Link>
    </div>
  );
}
