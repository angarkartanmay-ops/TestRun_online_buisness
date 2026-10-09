# Does QUORUM have potential? An honest check

**Verdict: yes, conditionally.** The demand signals are real. But tiered group buying is *not new*,
and in the West it has been tried and abandoned more than once. The product only works if it
fixes the specific reasons those attempts faded. This document lists the evidence, then the six
product decisions it forced — all six are built into the code.

## What the evidence supports

| Signal | Evidence | Source |
|---|---|---|
| Friends drive Gen Z purchases | 65% of Gen Z say friends play a crucial role in shopping choices; 64% say a positive group-chat response has prompted a purchase. *Caveat: Snapchat-commissioned, mostly Australian samples.* | [AMI / Crowd DNA](https://ami.org.au/knowledge-hub/friends-are-the-big-influence-on-gen-z-shopping-habits-beauty-tips-in-australia-latest-snapchat-research-shows/), [B&T](https://www.bandt.com.au/gen-z-go-mall-maxxing-as-friendfluence-in-word-of-mouth-group-chats-reshapes-purchase-journey/) |
| Team buying can work at enormous scale | Pinduoduo grew to China's #3 e-commerce company on team purchase, with buyers as the marketing channel and sharing at "two taps" inside WeChat. | [YC library](https://ycombinator.com/library/2z-pinduoduo-and-the-rise-of-social-e-commerce), [Modern Retail](https://www.modernretail.co/platforms/how-pinduoduo-is-competing-with-alibaba-by-building-commerce-communities/) |
| Young buyers will pre-order and wait | Telfar's 24-hour, made-to-order Bag Security Program generated 10× the brand's entire 2019 sales in one day — with delivery months away. | [V Magazine](https://vmagazine.com/article/secure-a-telfar-bag-at-the-24-hour-pre-order-event), [Bustle](https://www.bustle.com/style/telfar-bag-security-program-changing-luxury-fashion) |
| Western demand for tiered drops existed | Massdrop's first drop took a $600 item to $400 at 30 members. Users later blamed Drop's decline on moving *away* from group buys. | [Fortune](https://fortune.com/2015/08/13/massdrop-group-buying-funding), [HN discussion](https://hn.svelte.dev/item/47656981) |

## What the evidence warns

| Warning | Evidence |
|---|---|
| **The model has died before.** | Mercata ("we-commerce", Paul Allen-backed) and MobShop both shut in January 2001. Shoppers had to *wait* for discounts that big retailers sometimes beat anyway, on consumer durables. ([The Register](https://www.theregister.com/2001/01/16/mobshop_ditches_consumer_biz/), [Computerworld](https://www.computerworld.com/?p=1577871)) |
| **Even the success story dropped the tiers.** | Massdrop support called tiered pricing a "legacy feature" by ~2019. Drop (acquired by Corsair, 2023) is closing its standalone store. I could not retrieve Drop's stated reason, so I'm not claiming one. ([Drop Talk](https://drop.com/talk/18352/where-are-the-different-price-tiers-for-drops)) |
| **Big groups are friction.** | Pinduoduo cut its required team size from 10+ to **two** as it scaled; teams must form within 24 hours. |
| **Card holds expire.** | Online card authorisations are valid for **7 days** on Visa, Mastercard, Amex and Discover (customer-initiated). A drop that runs longer can't be captured. ([Stripe](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method)) |
| **Shipping dates are law.** | The FTC Mail, Internet, or Telephone Order Rule requires a reasonable basis for the stated ship time (30 days if none is stated), and consent or a refund for any delay. ([FTC](https://ftc.gov/business-guidance/resources/business-guide-ftcs-mail-internet-or-telephone-order-merchandise-rule)) |
| **The closest new entrant is big.** | Instacart's Fizz (group carts for Gen Z, via Partiful) shows incumbents see the same behaviour. ([eMarketer](https://www.emarketer.com/content/instacart-targets-gen-z-with-standalone-party-app-fizz)) |

## The six decisions this forced

1. **The first tier has to be reachable by one group chat.** Mercata and Massdrop asked strangers
   to coordinate; Pinduoduo asked two friends. QUORUM's first tier is capped at 25 members, and the
   admin tool warns when a ladder's first step is unrealistic.
2. **Short windows: 72 hours by default, 6 days hard maximum.** That's inside the 7-day card hold
   with a day to settle, and close to the 24–36h windows that worked for Telfar and Pinduoduo.
3. **Everyone gets a crew link, not just hosts.** The group chat is the distribution channel. Every
   member's link carries their code, and the link preview (the iMessage/Discord card) shows the
   live price and how many more people it needs. That card is our version of WeChat's two taps.
4. **Unlocked tiers stay unlocked (the ratchet).** Mercata was accused of implying volume deals
   that weren't real. Here the ladder is a contract with the brand. Once a tier unlocks it can't
   re-lock, so the price can only ever fall.
5. **A ship-by date on every drop, refund if missed.** That turns the FTC rule into a bylaw instead
   of a liability, and addresses Mercata's "you had to wait" problem by making the wait explicit
   and enforceable.
6. **Niche, enthusiast categories first.** Commodity durables are where Amazon beats you, which is
   what killed Mercata. Massdrop's best years were mechanical keyboards and headphones, categories
   where a community already exists and the receipt matters.

## What would prove it — the pilot

Run 20 drops in one category with 10 host groups. Kill or continue on these numbers:

| Metric | Continue if | Why it matters |
|---|---|---|
| First-tier clear rate | ≥ 70% within 72h | Tests whether one group chat really can open a drop |
| Joins via crew links | ≥ 50% of members | Tests whether the distribution loop exists without ads |
| Repeat members in 60 days | ≥ 30% | The payback math in `BUSINESS.md` needs > 3 orders a year |
| Brands that run a second drop | ≥ 60% | Tests whether the ratchet is acceptable to suppliers |

If the first-tier clear rate is low, the honest pivot is the Pinduoduo one: two-person teams and a
single "with friends" price, not a four-step ladder.
