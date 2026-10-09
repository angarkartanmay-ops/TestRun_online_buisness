# QUORUM — a buyers' union

> Alone you pay retail. Together you pay the mill.

Gen Z already decides what to buy in the group chat, then buys alone at retail. QUORUM makes the
group the transaction: a **drop** has a price ladder, every person who joins pushes the price down
for **everyone** — first in included — and every cleared drop publishes its full cost receipt.

- **Business case:** [`docs/BUSINESS.md`](docs/BUSINESS.md)
- **Does it have potential? The evidence, for and against:** [`docs/VALIDATION.md`](docs/VALIDATION.md)
- **Going live:** [`docs/DEPLOY.md`](docs/DEPLOY.md)

## How a drop works

| Step | What happens | In code |
|---|---|---|
| Join | Card **hold** at the current price — the most you can pay | `joinDrop` → Stripe `capture_method: "manual"` |
| More join | Crossing a tier drops the price for everyone. Tiers never re-lock (the ratchet) | `applyRatchet` — `GREATEST()` in SQL |
| Leave | Free before quorum and for 1 hour after joining; then locked in | `canLeave` |
| Close | Capture the final price for everyone; the bank releases the rest. Below quorum, release all | `settleDrop` — idempotent, resumable |
| Ship | Ship-by date on every drop; miss it and every member is refunded | `overdueDrops`, `refundDrop` |
| Share | Every member gets a crew link; the link preview shows the live price | `proxy.ts`, `opengraph-image.tsx` |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No setup needed. With no environment variables, the app uses an embedded Postgres (PGlite, stored
in `.pglite/`), seeds sample drops, simulates card holds, and shows sign-in codes on screen. To
open `/admin` locally, start it with `ADMIN_EMAILS=you@example.com npm run dev` and read the code
from the terminal.

```bash
npm test           # 42 tests: tier math, auth, the full join → settle → refund lifecycle
npm run typecheck
npm run build
```

## Stack

Next.js 16 (App Router) · TypeScript · Drizzle ORM on Postgres (Supabase in production, PGlite
locally and in tests) · Stripe (manual-capture PaymentIntents) · Resend · Tailwind CSS v4 ·
Phosphor icons · Vitest.

```
src/
  app/                 pages, API routes, server actions, OG share cards
  components/          UI — LivePanel (polling + join flow), Ladder, SpecimenPlate, Receipt…
  lib/
    tiers.ts           pure price-ladder math, shared by server and browser
    pledges.ts         join · confirm · leave · the ratchet
    settle.ts          capture / release / payouts / refunds
    auth.ts            email-code sign-in, sessions
    payments/          Stripe + demo providers behind one interface
    db/schema.ts       10 tables
  proxy.ts             crew-link attribution
drizzle/               SQL migrations
tests/                 Vitest, against a real in-memory Postgres and a strict fake Stripe
```

## Design

"Union Thermal": bulletin-stock paper, union blue, one stamp-red accent for price movement, and
the thermal receipt as a second material. Big Shoulders (variable, optical-size axis) for display,
Archivo for text, JetBrains Mono for every number. Full light and dark palettes. Drops without
brand photography show a **specimen plate** — category, origin codes, a glyph and the spec line —
rather than a fake product render.

## Status

Built to the point of being deployable. Payments run in **preview mode** (simulated, clearly
bannered) until Stripe keys are added; the sample brands and drops are fictional and removable with
one command. See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the remaining steps and the honest list of
known limits.
