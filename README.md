# QUORUM — a buyers' union

> Alone you pay retail. Together you pay the mill.

A Gen-Z-native online business and its website. Gen Z already decides what to buy in the group
chat — screenshot, "should I get this", verdict — but then buys alone, at retail. QUORUM makes the
group the transaction: **the price falls for everyone as more people join, including the people who
joined first.**

## The business in five lines

- A **drop** is one item, one brand, one deadline and a **price ladder** (25 members → $41,
  100 → $33, 250 → $27, 500 → $23).
- Joining **authorises** your card; it never charges it. Cross a tier and *everyone* drops to the
  new price — earlier members are refunded the difference.
- Below tier one, nothing is manufactured and nobody is charged.
- We take **8%** of cleared volume, shown as a line on your receipt. **3%** of that goes to the
  host who brought the group — that is the entire marketing budget.
- Every cleared drop gets a **published receipt**: mill, cut-and-sew, dye lot, freight, duty code,
  the brand's margin and our fee, to the cent.

Membership is free and permanent. There is no subscription and no advertising.

**Why it can be this cheap:** a cleared drop is a pre-paid, guaranteed order, which deletes the
wholesale markup, the retail markup, the unsold-stock reserve and the ad spend — $36.84 per unit on
a $58 tee. Not one cent of material or labour is removed.

Full business case, unit economics, go-to-market, moat and risks: **[`docs/BUSINESS.md`](docs/BUSINESS.md)**.

## The website

Four pages, hand-written, **no build step and no dependencies**.

| Page | What's on it |
|---|---|
| `index.html` | Hero with a **draggable dial** — move it and watch the price fall through the tiers. How a drop clears, live board, the six bylaws, FAQ, member signup. |
| `drops.html` | All eight open drops with live tier ladders, countdowns and category filtering. |
| `receipts.html` | The full line-by-line receipt for a $23 t-shirt, where our $1.84 goes, and brand deal terms. |
| `hosts.html` | Host program with an **earnings estimator**, and the data showing reach barely predicts conversion. |

### Design

An ironic-institutional register — union-hall bulletin, two-colour offset print — chosen because
the co-op/bureau aesthetic is both current and *true to the product*: this is a buyers' union that
publishes its paperwork.

- **Ink:** union blue `#1f2e5c` (structure) · stamp red `#d8452f` (price movement) · ledger green
  `#2f6b4f` (quorum met) · bulletin stock `#e4e5dc`
- **Type:** Big Shoulders Display (civic signage) / Archivo (body) / Courier Prime (receipts,
  ledgers, clocks)
- Full light **and** dark palettes, driven by tokens, honouring `prefers-color-scheme` *and* an
  explicit `data-theme` override.
- Responsive to 390px with no horizontal scroll, `prefers-reduced-motion` respected, visible focus
  states throughout.

### Run it

Any static server — nothing to install or compile:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` straight off disk works too; only the webfonts need the network.

### Structure

```
index.html  drops.html  receipts.html  hosts.html
css/quorum.css     design tokens + components (one stylesheet)
js/quorum.js       tier math, hero dial, boards, countdowns, estimator
docs/BUSINESS.md   the business case
```

`js/quorum.js` holds the single source of truth for drops: the `DROPS` array. Tier state is
derived by `stateOf()`, and every board, ticker and price on the site renders from it — change a
drop in one place and the whole site follows. Deadlines are stored as *hours remaining* rather than
dates, so the board never goes stale.

## Honest status

This is a **concept build**. The brands, drops, member counts and payouts are illustrative; no
goods are for sale and no payment is processed anywhere on the site. The signup forms save to
`localStorage` and say so on the page — there is no server behind them yet.

To make it real, in order: payment authorise-and-capture (the ladder needs auth-then-capture with
partial capture, plus retroactive refunds), a brand cost-sheet verification workflow, and host
payout rails.
