export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[1320px] px-4 sm:px-8 pt-10 sm:pt-14 grid gap-10 lg:grid-cols-12">
      <header className="lg:col-span-4">
        <p className="label text-ink-2">Small print · updated {updated}</p>
        <h1 className="display text-6xl mt-2">{title}</h1>
        <p className="mt-4 text-sm text-warn border border-warn/40 bg-paper-2 p-3">Draft for launch. Have a lawyer review this for your jurisdiction before taking real payments.</p>
      </header>
      <div className="lg:col-span-7 lg:col-start-6 grid gap-6 text-ink-2 leading-relaxed [&_h2]:display [&_h2]:text-3xl [&_h2]:text-ink [&_h2]:mt-4 max-w-[68ch]">{children}</div>
    </article>
  );
}
