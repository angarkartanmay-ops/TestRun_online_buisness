# Launch checklist

The app is deployable today in **preview mode** (simulated payments, sample drops). Going live
with real money is the list below, in order. Each step says what it unlocks, so you can stop at
any point and still have a working site.

## 0. What's already done

| | |
|---|---|
| Database | Supabase project `quorum` (us-east-1), schema migrated, row-level security on, app role created |
| Hosting | Vercel project `quorum`, connected to this repository |
| Sample data | Seeded once into the empty database (`SEED_DEMO=true`) |

## 1. Sign in to the admin console

`ADMIN_EMAILS` is set to the owner's email. Go to `/sign-in` and enter it.

Until email is configured (step 3), **admin codes are never shown on screen** — that would let
anyone take over the admin on a public preview. The code goes to the server log instead:
Vercel → Project → Logs, search `QUORUM code`. Only project members can see those logs.

## 2. Stripe — real card holds

1. Create a Stripe account and complete activation. In the activation form, describe the business
   as **pre-orders made after a fixed group window** and state the ship-by window (~6 weeks).
   Stripe reviews pre-order businesses for delivery risk; saying so up front avoids a hold later.
2. Add to Vercel → Settings → Environment Variables (Production):
   - `STRIPE_SECRET_KEY` = `sk_live_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
3. Stripe → Developers → Webhooks → **Add endpoint**
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook`
   - Events: `payment_intent.amount_capturable_updated`, `payment_intent.canceled`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy. The preview banner disappears once a Stripe key is present.

Test first with `sk_test_…` / `pk_test_…` keys and card `4242 4242 4242 4242`.

**Why manual capture:** joining calls `paymentIntents.create({ capture_method: "manual" })`;
settlement calls `capture({ amount_to_capture: finalPrice })`. Stripe releases the unused part of
the hold. Online card holds last 7 days, which is why drops are capped at 6.

## 3. Email — sign-in codes and drop updates

1. Create a [Resend](https://resend.com) account, add your domain, and add the DNS records it gives you.
2. Set `RESEND_API_KEY` and `EMAIL_FROM="QUORUM <union@yourdomain.com>"`.

**Important:** with live Stripe keys and no email provider, member sign-in fails closed (codes
can't be delivered and are never shown on screen). Do step 3 before or with step 2.

## 4. Domain

1. Buy the domain (Vercel → Domains, or any registrar).
2. Vercel → Project → Settings → Domains → add it.
3. Set `NEXT_PUBLIC_SITE_URL=https://yourdomain.com` (no trailing slash) and redeploy. It's used in
   share links, emails and the link-preview cards.
4. Update the Stripe webhook URL to the new domain.

## 5. Settlement schedule

Drops settle three ways, so nothing depends on any single one:

- **On view** — the first page view after a drop's deadline settles it.
- **Cron** — `vercel.json` sweeps daily (the Vercel Hobby limit). On Vercel Pro, change the schedule
  to `*/15 * * * *` for near-real-time settlement of drops nobody is looking at.
- **Admin** — the "Settle now" button.

`CRON_SECRET` must be set; Vercel sends it automatically as a bearer token.

## 6. Remove the sample data

1. Set `SEED_DEMO=false`.
2. Run `DATABASE_URL=… npm run db:reset` — deletes every `@demo.quorum.invalid` account and the
   sample drops. Real members and drops are never touched.

## 7. Legal

`/legal/terms`, `/legal/privacy` and `/legal/preorders` are drafts, marked as such on the page.
Have them reviewed for your jurisdiction. The pre-order page already reflects the FTC Mail,
Internet, or Telephone Order Merchandise Rule (stated ship date, consent or refund on delay).

## 8. Go-live smoke test

With live keys, run one real drop end to end with a $1 item and two cards:

1. Create the drop in `/admin/drops/new` with tiers `2 → $1.00`, `3 → $0.75`.
2. Join from two accounts. Confirm the holds in Stripe show as **Uncaptured**.
3. Set the window short, let it close, open the drop page.
4. Confirm both captured at $1.00 in Stripe and both "charged" emails arrived.
5. Mark it shipped, then refund it from the admin page.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Production | Postgres. Supabase: transaction pooler, port 6543 |
| `AUTH_SECRET` | Production | Signs login codes. `openssl rand -base64 32` |
| `ADMIN_EMAILS` | Production | Comma-separated admin emails |
| `CRON_SECRET` | Production | Protects the settlement sweep |
| `STRIPE_SECRET_KEY` | Live payments | Unset = preview mode |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live payments | Card form |
| `STRIPE_WEBHOOK_SECRET` | Live payments | Webhook signature check |
| `RESEND_API_KEY` | Live payments | Email delivery |
| `EMAIL_FROM` | With Resend | Sender address on your verified domain |
| `NEXT_PUBLIC_SITE_URL` | With a domain | Canonical URL |
| `SEED_DEMO` | Preview only | Seed sample drops into an empty database |
| `CURRENCY` | Optional | Default `usd` |

## Known limits — the honest list

- **Host payouts are manual.** The app computes them (3%, per drop) and the admin marks them paid.
  Automating needs Stripe Connect.
- **Brand payouts are manual** for the same reason (the money sits in your Stripe balance).
- **One item variant per drop.** No sizes yet. Run sizes as separate drops, or add a variant
  column to `pledges` (the `size` field exists but isn't surfaced).
- **Emails are plain text** and sent inline after the response; a drop with thousands of members
  should move tier-unlock emails to a queue.
- **No photo upload.** Drops take an https image URL; without one they show a specimen plate.
