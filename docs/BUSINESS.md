# QUORUM — a buyers' union

**One line.** Gen Z already decides what to buy in the group chat; QUORUM makes the group chat
the transaction, and the price falls for everyone as the group grows.

This document is the business case. The site in the repository root is its prototype.

---

## 1. The wedge

Three things are simultaneously true about the 13–28 cohort:

1. **Purchase decisions are already collective.** The default path to a purchase is screenshot →
   group chat → "should I get this" → verdict. The deciding happens in a group; the buying happens
   alone, at retail.
2. **Aesthetic ambition far exceeds disposable income.** They want the 12oz loopback tee and the
   selvedge pant. They are priced out of both, so they buy the $12 version twice a year instead.
3. **Marketing claims are assumed false until itemised.** "Ethically made" is noise. A named mill,
   a duty code and a cost sheet are signal. This cohort will forgive a high price far sooner than
   an unexplained one.

Retail's answer to (2) is a discount code, which is just a markup admitting itself. Our answer is
to remove the markups entirely by removing what they pay for: inventory risk.

## 2. The mechanic

A **drop** is one item, one brand, one deadline, and a **price ladder**:

| Members in | Unit price |
|---|---|
| 25 | $41 |
| 100 | $33 |
| 250 | $27 |
| 500 | $23 |

- Joining **authorises** the current tier. It never charges it.
- Crossing a tier moves **everyone** to the new price, including members who joined at a higher
  one — the difference is refunded to the card they joined with.
- At the close we capture the lowest tier unlocked and the brand manufactures exactly that number
  plus a 3% defect buffer.
- Below tier one, nothing is made and nobody is charged. Roughly 1 in 9 drops misses quorum.

The retroactive refund is the design decision the whole thing rests on. Conventional group buying
punishes early joiners by making them the ones who take the risk, which suppresses exactly the
behaviour the model needs. Here, joining first is strictly dominant: you can only be refunded.

## 3. Why the price can fall this far

A cleared drop is a pre-paid, guaranteed order. That deletes four costs (per unit, on a tee that
retails at $58):

| Removed | Per unit | What it was paying for |
|---|---|---|
| Wholesale markup | $14.50 | A distributor carrying stock and credit |
| Retail markup | $11.60 | Shelf space, staff, floor risk |
| Unsold-stock reserve | $6.40 | The ~22% of a run that marks down |
| Paid acquisition | $4.34 | Ads to find one buyer |
| **Our fee, added back** | **−$1.84** | Running the union |
| **Net to the member** | **$35.00** | |

Not one cent of material or labour is removed. The mill, the sewing floor and the dye house are
paid identically either way — which is the point, and is why the receipt is publishable.

## 4. Revenue

| Line | Rate |
|---|---|
| Take on cleared drop volume | **8%** |
| Take with category exclusivity | 11% |
| Listing / slotting fee | $0 |
| Membership | $0, permanently |
| Host share (paid **out of** the 8%) | 3% |

We earn nothing on a drop that misses quorum. There is no subscription and no advertising
inventory — both would put us in conflict with the members, who are the only reason brands accept
these terms.

## 5. Unit economics

Per order, at a $34 average basket:

| | |
|---|---|
| Gross fee (8%) | $2.72 |
| Host share (3%) | −$1.02 |
| Support + refund reserve | −$0.35 |
| **Net contribution** | **$1.35** |

Per drop, at the 340-unit median: **$11,560** volume → **$925** fees → **$459** contribution.

Blended CAC is **$4.10** — low because acquisition is a revenue share with hosts rather than ad
spend. At 3.4 orders per member per year, contribution is $4.59/year and **payback is 10.7
months**.

**This is the weak number and we should say so.** Eight points on a $34 basket is not a
comfortable business, and the model only works at volume. Two levers fix it, neither of which
charges members more:

1. **Category exclusivity at 11%** — a brand runs a category only with us for a season.
2. **Local 001**, our own label: designed in-house, made at the same mills, sold at member price
   with a **34% gross margin** because there is no third party to pay. Members pay the same price
   either way; we simply keep the brand's margin instead of 8% of it.

## 6. Go to market

Hosts are the entire channel. A host brings a group, sets the brief, posts one link, and takes 3%.

The counter-intuitive finding in the sample on `hosts.html` is that **reach is nearly useless as a
predictor**:

| Host | Reach | Joined | Rate |
|---|---|---|---|
| Ceramics night class, Leeds | 44 | 31 | 70.5% |
| Bouldering gym chat | 310 | 96 | 31.0% |
| Audio-nerd Discord | 8,400 | 1,104 | 13.1% |
| Fit-check creator | 1,100,000 | 452 | 0.04% |

A tight group with a shared problem converts three orders of magnitude better than a large
audience with nothing in common. So we recruit *groups*, not influencers: Discords, run clubs,
classes, team chats, course cohorts. They are cheaper to reach, more loyal, and they produce the
standing brief list — what real groups have said out loud they would buy — which is the only
proprietary asset here.

## 7. Moat

Weak on technology, strong on structure:

- **A liability, deliberately chosen.** The bylaws (price only falls, factory always named, fee
  always shown, no subscription) are each a revenue line we have given up. A marketplace that
  later wants them has to explain why it didn't have them.
- **Demand data nobody else has.** Not what people browsed — what a named group committed to buy
  at a named price, before it existed.
- **Two-sided habit.** Brands get zero-risk production; hosts get paid. Both sides churn to a
  competitor only if it brings the group, and the group belongs to the host.

## 8. What kills it

| Risk | Why it's serious | Response |
|---|---|---|
| Thin margin | $1.35/order leaves no room for error | Local 001 own-brand; exclusivity at 11% |
| Long lead times | 4–7 weeks vs. next-day everywhere else | Print the window on every drop; never extend a deadline |
| Quorum failure | A dead board teaches members not to return | Ladders set with the host, who knows the group; publish the miss rate |
| Brand cost-sheet fraud | The receipt is the whole promise | Verify cost sheets against invoices pre-listing; one strike |
| A marketplace incumbent copies the ladder | They have the traffic | They cannot copy the bylaws without repricing their own business |
| Regulatory (pre-order/refund rules) | We hold authorisations on undelivered goods | Authorise-don't-capture; release inside 24h on a miss |

## 9. Roadmap

| Phase | Goal | Test it passes or fails on |
|---|---|---|
| 1 | 20 drops, 1 category (heavyweight basics), 10 hosts | Does a drop clear without paid acquisition? |
| 2 | Published receipt for every cleared drop | Does transparency measurably lift repeat rate? |
| 3 | Host brief list → brand pairing | Can we take a group's brief to a mill and get a yes? |
| 4 | Local 001 first own-brand drop | Does gross margin reach 34% at member price? |
| 5 | Category exclusivity deals | Will a brand trade optionality for guaranteed volume? |

## 10. Metrics that matter

- **Join-rate by group type** (not by follower count)
- **Quorum clear rate** — target > 85%, published either way
- **Retroactive refund total** — a cost that proves the promise; we want it *high*
- **Repeat orders per member per year** — the payback lever, target > 5
- **Host retention across drops** — the channel is only as durable as this

---

*Concept build. QUORUM is not a trading company; brands, drops, member counts and payouts in this
repository are illustrative.*
