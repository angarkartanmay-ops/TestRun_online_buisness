# Launch checklist — India first

The site runs today in **practice mode**: practice drops, nobody pays. Each step below switches on
one more real thing, so you can stop at any point and still have a working site. The order matches
the pilot plan in [PILOT.md](PILOT.md).

## 0. Status

**https://quorum-chi-roan.vercel.app**

| | |
|---|---|
| Hosting | Vercel project `quorum` (`prj_a4gMytV7swkbFLZmpnew4P8d6hTP`), region `iad1`. Production is public; preview deployments stay behind Vercel login. |
| Database | Supabase `quorum` (`kroeasqlezuxpojwoofl`, us-east-1) via the shared pooler at `aws-0-us-east-1.pooler.supabase.com:6543` as the least-privilege `quorum_app` role. Row-level security on every table; the public Data API is locked out. |
| Currency | INR (`NEXT_PUBLIC_CURRENCY`, default `inr`). Dates in IST. |
| Payments | Mode is picked from the environment: **practice** (nothing set — nobody pays) → **pay after close** (`UPI_VPA` and/or Razorpay keys) → **card holds** (`STRIPE_SECRET_KEY`, for US/UK later). `/api/health` and the admin dashboard show which one is active. |
| Practice drops | `SEED_DEMO=true` keeps four labelled practice drops open at all times. The daily cron and an empty homepage both restock them. |

### Do these in a dashboard — they need a human click

1. **Turn on auto-deploy.** Vercel → `quorum` → Settings → Git → *Connect Git Repository* →
   `angarkartanmay-ops/TestRun_online_buisness`. Until then, pushes don't deploy on their own.
2. **Remove `pg_net`.** Supabase → SQL editor: `drop extension pg_net;` (the security advisor flags it).
3. **Rotate the secrets that passed through the setup chat.**
   - Database: Supabase → SQL editor: `alter role quorum_app with password 'NEW-PASSWORD';`, then
     update `DATABASE_URL` in Vercel.
   - `AUTH_SECRET` and `CRON_SECRET`: Vercel → Settings → Environment Variables → replace each with
     the output of `openssl rand -base64 32`.
   - Redeploy after changing them. Rotating `AUTH_SECRET` signs everyone out once; that's expected.

### If the database ever stops connecting

`/api/health` reports the driver's own error.

- `Tenant or user not found` → the pooler host or username is wrong. Copy the host from Supabase →
  **Connect** → *Transaction pooler*; the username is `quorum_app.kroeasqlezuxpojwoofl`.
- `password authentication failed` → the password in `DATABASE_URL` doesn't match the role.
- Free Supabase projects **pause after 7 days without traffic** — restore from the dashboard.

## 1. Admin console

`ADMIN_EMAILS` is set to the owner's email. Go to `/sign-in` and enter it. Until email is set up
(step 2) admin codes are never shown on screen — they go to the server log: Vercel → Project →
Logs, search `QUORUM code`.

The dashboard at `/admin` shows the **pilot gate** (the five go/stop numbers), every drop, and a
*Refresh practice drops* button. Each drop's page has the pilot funnel, the size order sheet, and
the list of members still to pay.

## 2. Email — required before any real payment

1. Create a [Resend](https://resend.com) account (free: 100 emails/day), add your domain, add its DNS records.
2. Set `RESEND_API_KEY` and `EMAIL_FROM="QUORUM <hello@yourdomain.com>"`. Redeploy.

With real payments switched on and no email provider, **member sign-in fails closed** — codes
can't be delivered and are never shown on screen. Do this step first.

## 3. Friends test — pay after close by UPI

For a handful of friends only (see PILOT.md for why).

1. Set `UPI_VPA` to the UPI ID money should go to (e.g. `name@okaxis`) and `UPI_PAYEE_NAME`.
2. Redeploy. The admin dashboard now says *Pay after close — UPI to name@okaxis*.
3. Create the drop in `/admin/drops/new`. Leave **Practice drop** unticked.

What happens: joining is a promise (nothing paid). At close, if the drop cleared, each member gets
an email and an account-page box with the final price, a UPI link (phones), a QR code (computers),
the UPI ID and a note like `QRM-7F3A9C`. They pay, tap *I've paid*; you check your bank app for
the note and press **Mark paid** on the drop's admin page. After 48 hours press **Close payments**
to release anyone who didn't pay.

**Don't use a personal UPI ID for public drops.** UPI's peer-to-peer "collect" requests ended on
1 Oct 2025, and banks reclassify or freeze personal accounts that receive many small business
payments. It's fine for five friends; for campus pilots use step 4.

## 4. Campus pilots — Razorpay payment links

Razorpay onboards individuals with a PAN, no GSTIN needed. Fee: 2% + GST.

1. Sign up at Razorpay, complete KYC as an individual, and switch to live mode.
2. Settings → API Keys → generate. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Settings → Webhooks → add `https://YOUR-DOMAIN/api/razorpay/webhook`, event
   **`payment_link.paid`**, with a secret you choose. Set it as `RAZORPAY_WEBHOOK_SECRET`.
4. Redeploy. At close, each member gets a Razorpay payment link (UPI or card) for the final price;
   the webhook marks them paid automatically. If a link can't be created, that member falls back
   to the UPI box (when `UPI_VPA` is set) — settlement never stalls.

**Untested against a live Razorpay account.** The integration follows Razorpay's documented
Payment Links API and is covered by tests with a stand-in; run the smoke test (step 9) with a ₹1
drop before the first real one.

## 5. After the pilot gate passes (not built yet)

- Register (sole proprietorship + Udyam, then GST via a CA — required as soon as you ship to
  another state) and open a current account.
- Ask Razorpay to enable **UPI one-time mandates** (block up to 60 days, debit part of it). That
  gives the true ratchet: block the top price at join, debit the final price at close. It slots in
  as a new `Payments` provider next to `src/lib/payments/commit.ts`.

## 6. Practice drops

`SEED_DEMO=true` (set in production) keeps the board stocked with four practice drops — Indian
campus merch with real cost ladders, clearly labelled, simulated members, nobody pays. They restock
whenever fewer than two are open (daily cron, the admin button, or an empty homepage). Closed
practice drops are deleted after three weeks, except the newest cleared and missed examples.
The old sample catalogue is removed on the first refresh.

To launch without them: set `SEED_DEMO=false` and run `DATABASE_URL=… npm run db:reset`, which
deletes every `.invalid` account and the drops only they joined. Real members are never touched.

## 7. Compliance (India)

Before the first paid drop, set:

| Variable | What it shows |
|---|---|
| `SELLER_NAME`, `SELLER_ADDRESS` | Seller identity on `/legal/grievance` |
| `GRIEVANCE_NAME`, `GRIEVANCE_EMAIL` | Grievance officer (Consumer Protection (E-Commerce) Rules 2020: acknowledge in 48 h, resolve in a month) |

Already handled in the product: country of origin on every drop, all-in prices (GST + delivery
included, nothing added at checkout), returns/exchange policy at `/legal/shipping-returns`, real
countdowns and real member counts only (CCPA dark-pattern guidelines), practice drops labelled.

The legal pages are drafts, marked as such. Have a lawyer or CA review them before taking money
from people you don't know.

## 8. Domain

1. Buy the domain (Vercel → Domains, or any registrar).
2. Vercel → Project → Settings → Domains → add it.
3. Set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` (no trailing slash) and redeploy.
4. Update the Razorpay webhook URL.

## 9. Smoke test with real money

1. In `/admin/drops/new`: a house drop, tiers `2 → ₹2` (cost ₹1), `3 → ₹1.50` (cost ₹1), window 12 h.
   (Raise the club fund to 0% so the margin check passes on tiny prices.)
2. Join from two accounts. Let it close, open the drop page.
3. Both accounts get a pay email and a pay box. Pay one by UPI, one by the Razorpay link.
4. The Razorpay one turns *Paid* on its own; mark the UPI one paid. Close payments.
5. Refund both by UPI and press *Refund every member*.

## 10. Settlement schedule

Drops settle three ways: on the first page view after the deadline, the daily cron
(`vercel.json`, the Hobby-plan limit — `*/15 * * * *` on Pro), and the admin *Settle now* button.
`CRON_SECRET` must be set.

## Environment variables

| Variable | Needed for | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres. Supabase: transaction pooler, port 6543 |
| `AUTH_SECRET` | Production | Signs login codes. `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Production | Comma-separated admin emails |
| `CRON_SECRET` | Production | Protects the settlement sweep |
| `SEED_DEMO` | Practice drops | `true` keeps practice drops stocked |
| `RESEND_API_KEY`, `EMAIL_FROM` | Any real payment | Email delivery |
| `UPI_VPA`, `UPI_PAYEE_NAME` | Friends test | Pay after close by UPI link / QR |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Campus pilots | Payment links + auto-confirm |
| `SELLER_NAME`, `SELLER_ADDRESS`, `GRIEVANCE_NAME`, `GRIEVANCE_EMAIL` | First paid drop | Legal contact page |
| `NEXT_PUBLIC_SITE_URL` | A domain | Canonical URL for links and emails |
| `NEXT_PUBLIC_CURRENCY` | Other markets | `inr` (default), `usd`, `gbp` |
| `NEXT_PUBLIC_TIME_ZONE` | Other markets | Default `Asia/Kolkata` for INR |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | US/UK later | Card holds, captured at close |

## US / UK later — card holds (Stripe)

Stripe is invite-only in India, so this is for a later US/UK launch on its own deployment with
`NEXT_PUBLIC_CURRENCY=usd` or `gbp`. Joining places a manual-capture hold; settlement captures
the final price and Stripe releases the rest. Webhook: `/api/stripe/webhook`, events
`payment_intent.amount_capturable_updated` and `payment_intent.canceled`. Card holds last 7 days,
which is why drops are capped at 6.

## Known limits — the honest list

- **Payment matching for UPI is manual.** You match the `QRM-` note in your bank app and press
  Mark paid. Razorpay links remove this step.
- **Refunds are manual** in pay-after-close mode: send the money back by UPI, then press refund.
- **Club-fund payouts are manual.** The app computes them per drop; you pay by UPI and mark them paid.
- **Production orders are manual.** The admin drop page gives the size order sheet; you place the
  order with the printer.
- **No photo upload.** Drops take an https image URL; without one they show a specimen plate.
- **Emails are plain text** and sent inline; a drop with thousands of members would need a queue.
