# QUORUM — a buyers' union

> Alone you pay retail. Together you pay the mill.

Gen Z already decides what to buy in the group chat, then buys alone at retail. QUORUM makes the
group the transaction: a **drop** has a price ladder, every person who joins pushes the price down
for **everyone** — first in included — and every cleared drop publishes its full cost receipt.

India first, starting with **campus merch**: batch hoodies, fest tees, society totes. Today
someone fronts the money, chases payments on WhatsApp and ends up with spare sizes; on QUORUM the
sizes and payments collect themselves and nobody pays unless the drop reaches its first tier.

- **Live (practice mode):** https://quorum-chi-roan.vercel.app
- **Running the pilot (friends test → campus drops → decision gate):** [`docs/PILOT.md`](docs/PILOT.md)
- **Business case:** [`docs/BUSINESS.md`](docs/BUSINESS.md)
- **Does it have potential? The evidence, for and against:** [`docs/VALIDATION.md`](docs/VALIDATION.md)
- **Going live:** [`docs/DEPLOY.md`](docs/DEPLOY.md)

## How a drop works

| Step | What happens | In code |
|---|---|---|
| Join | Pick a size; a **promise** at the current price — the most you can pay (India). Or a card hold (Stripe, US/UK later) | `joinDrop` · `payments/commit.ts` · `payments/stripe.ts` |
| More join | Crossing a tier drops the price for everyone. Tiers never re-lock (the ratchet) | `applyRatchet` — `GREATEST()` in SQL |
| Leave | Free before quorum and for 1 hour after joining; then locked in | `canLeave` |
| Close | Below quorum, nobody pays. Above it, everyone owes the final price: a Razorpay link or UPI link + QR, marked paid by webhook or by the admin | `settleDrop` → `requestPayment`, `markPaid`, `closeCollection` |
| Price | House drops carry a unit cost per tier; no tier can be priced under a 20% margin | `validateTiers` · `tierMargins` |
| Ship | Ship-by date on every drop; miss it and every member is refunded | `overdueDrops`, `refundDrop` |
| Share | Every member gets a crew link; the link preview shows the live price | `proxy.ts`, `opengraph-image.tsx` |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

No setup needed. With no environment variables, the app uses an embedded Postgres (PGlite, stored
in `.pglite/`), seeds the practice drops (Indian campus merch, nobody pays), and shows sign-in codes on screen. To
open `/admin` locally, start it with `ADMIN_EMAILS=you@example.com npm run dev` and read the code
from the terminal.

```bash
npm test           # 62 tests: tier math, margin guard, auth, card-hold and pay-after-close lifecycles
npm run typecheck
npm run build
```

## Stack

Next.js 16 (App Router) · TypeScript · Drizzle ORM on Postgres (Supabase in production, PGlite
locally and in tests) · Stripe (manual-capture PaymentIntents) · Resend · Tailwind CSS v4 ·
Phosphor icons · Vitest. Payments: pay-after-close (UPI links, Razorpay Payment Links) for India,
Stripe manual capture for later markets.

```
src/
  app/                 pages, API routes, server actions, OG share cards
  components/          UI — LivePanel (polling + join flow), Ladder, SpecimenPlate, Receipt…
  lib/
    tiers.ts           pure price-ladder math, shared by server and browser
    pledges.ts         join · confirm · leave · the ratchet
    settle.ts          capture / release / payouts / refunds
    auth.ts            email-code sign-in, sessions
    payments/          commit (pay after close), Razorpay links, Stripe, demo — one interface
    seed.ts            practice drops + the restock that keeps the board from going empty
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

Deployed on Vercel with a Supabase database. Runs in **practice mode** (labelled practice drops,
nobody pays) until a UPI ID or Razorpay keys are added; the practice groups and products are
fictional and removable with one command. See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the remaining steps and the honest list of
known limits.
