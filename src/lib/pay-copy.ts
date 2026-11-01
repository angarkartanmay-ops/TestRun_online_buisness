/**
 * The words for how paying works, in one place. "card": a hold now, captured at
 * close (Stripe — US/UK). "later": a promise now, the final price paid after
 * close (India). Practice drops override both: nobody pays. Pure — client-safe.
 */
export type PayStyle = "card" | "later";

export function payCopy(style: PayStyle, practice = false) {
  const card = style === "card";
  return {
    joinCta: (price: string) => (practice ? "Join the practice drop" : card ? `Join — hold ${price}` : `Join — ${price} at most`),
    joining: card && !practice ? "Placing hold…" : "Joining…",
    underCta: (price: string) =>
      practice
        ? "Practice drop: the other members are simulated and nobody pays — join to see what happens at each tier."
        : card
          ? `Your card is held, never charged, until the drop closes. Then you pay the closing price — ${price} at most, less if more people join.`
          : `Nothing to pay now. If the drop reaches its first tier, you pay the closing price after it closes — ${price} at most, less if more people join. If it doesn't, you owe nothing.`,
    memberLine: (held: string, current: string | null) =>
      practice
        ? `Practice spot at ${current ?? held}. Nothing to pay, ever.`
        : card
          ? `Hold: ${held} — the most you can pay. You'll be charged the closing price${current ? `, currently ${current}` : ""}.`
          : `${held} at most — nothing paid yet. After it closes you pay the closing price${current ? `, currently ${current}` : ""}.`,
    leave: card && !practice ? "Leave this drop and release my hold" : "Leave this drop",
    closing: card ? "Closing — settling holds" : "Closing — working out the final price",
    canceled: card ? "Cancelled — every hold released" : "Cancelled — nobody pays",
    missed: "Missed quorum — nobody pays",
    stepsTitle: card ? "What happens to your card" : "What happens to your money",
    steps: (hold: string, closes: string, shipBy: string): [string, string][] =>
      card
        ? [
            ["Now", `A hold at the current price — ${hold}. Not a charge.`],
            [`At close, ${closes}`, "We charge the closing price, equal or lower. Your bank releases the rest."],
            [`By ${shipBy}`, "It ships — or every member is refunded in full."],
          ]
        : [
            ["Now", `A promise at the current price — ${hold} at most. Nothing is paid.`],
            [`At close, ${closes}`, "If it reached the first tier, everyone pays the final price by UPI within 48 hours. If not, nobody pays."],
            [`By ${shipBy}`, "It ships — or every member is refunded in full."],
          ],
  };
}
