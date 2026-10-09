export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    live: "bg-stamp text-stamp-ink",
    settling: "bg-warn text-paper",
    succeeded: "bg-go text-paper",
    failed: "bg-paper-2 text-ink-2",
    canceled: "bg-paper-2 text-ink-2",
    draft: "border border-dashed border-ink-3 text-ink-2",
  };
  return <span className={`label px-2 py-1 inline-block ${tone[status] ?? "bg-paper-2"}`}>{status}</span>;
}
