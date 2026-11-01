# The pilot — friends test, campus drops, then decide

The business case (see BUSINESS.md) rests on two numbers nobody has measured yet: **how many people
in a group actually buy**, and **what a unit really costs**. In simulation, those two swing the
outcome more than everything else combined. The pilot measures both, cheaply, before any money is
spent on registration, ads or paid tiers.

## Phase B — friends test (2 weeks, ₹0 of your money)

1. Pick one design. Use the **Friends Test Tee** ladder: 5 people → ₹699, 10 → ₹599, 15 → ₹549.
2. Make it print-on-demand (no minimum order), shipped straight to each friend. The unit cost on
   the ladder (₹386) is a 180 GSM tee printed and shipped by an Indian POD printer.
3. Set `UPI_VPA` (DEPLOY.md step 3) and create the drop in the admin, not as practice.
4. Share the link in one group chat. Watch the admin funnel: views → joined → paid.
5. At close, everyone pays the final price by UPI. Place the POD orders yourself, one per member,
   using the size order sheet.

**What you're learning:** does the flow make sense to people without you explaining it, and what
share of people who join actually pay.

## Phase C — campus pilots (Jan–Feb 2027, fest season)

Five drops across two or three colleges or clubs, in **one state** (no GST registration needed
while you stay inside one state and under ₹40 lakh). Payments by Razorpay links (DEPLOY.md step 4).

**Ladder:** put the tiers where the factory price drops — 15 (small batch), 50 (bulk), 100 (bulk).
The admin form refuses any tier with less than 20% margin after GST, gateway, club fund and cost.
Start from the practice ladders:

| Item | 15 | 50 | 100 |
|---|---|---|---|
| Batch hoodie (400 GSM) | ₹1,049 | ₹899 | ₹799 |
| Crew oversized tee (240 GSM) | ₹649 | ₹549 | ₹479 |
| Society canvas tote | ₹399 | ₹329 | ₹279 |

### Sourcing

| Order size | Where | Notes |
|---|---|---|
| Under 15 | Print-on-demand | No minimum. Ships to each person. ~₹386 tee, ₹620–980 hoodie, all-in. |
| 15–49 | Local small-batch printer | Minimums of 5–10 pieces. ~₹330–430 tee, ₹600–800 hoodie. |
| 50+ | Tiruppur (tees), Ludhiana (hoodies) | Via IndiaMART. Get 3–5 written quotes. ~₹340 → ₹240 tee and ₹565 → ₹405 hoodie, 50 → 500 pieces. |

- Order **one paid sample** (about ₹700 + courier) before the first bulk order.
- Pay the vendor's advance (usually 50%) **only from money members have already paid**.
- Ship in **one parcel to the host on campus** (₹10–25 a piece) and hand out at a club stall.

### Who to talk to

Batch reps, fest committees, college societies. The pitch is the pain they already have:
*nobody fronts the cash, sizes and payments collect themselves, no spare XLs, and the club fund
gets 5%.*

## Phase D — the decision gate (end of February 2027)

The admin dashboard computes these from real drops. Continue only if **all five** pass:

| | Target |
|---|---|
| Drops that cleared | ≥ 3 of 5 |
| Median units per cleared drop | ≥ 25 |
| Members who paid | ≥ 70% |
| Contribution per unit | ≥ ₹80 |
| Hosts who want a second drop | ≥ 2 |

**Pass:** register (DEPLOY.md step 5), switch on UPI one-time mandates, and plan the Jul–Sep
season with campus ambassadors. **Fail:** either sell just the group-order tool to clubs (sizes +
payments + minimum tracking, no production), or stop — having spent almost nothing.
