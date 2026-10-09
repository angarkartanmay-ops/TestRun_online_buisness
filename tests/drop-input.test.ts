import { describe, expect, it } from "vitest";
import { parseDropForm, parseReceipt } from "@/lib/drop-input";

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    brand: "Fieldwork", item: "Ripstop Camp Shirt", slug: "fieldwork-ripstop-camp-shirt", blurb: "", spec: "",
    category: "apparel", glyph: "tshirt", plate: "sage", imageUrl: "", retail: "88", origin: "Cut + sewn in Porto, PT",
    opensAt: "2026-10-09T12:00", windowHours: "72", shipDays: "42", resaleIndex: "",
    tiers: JSON.stringify([{ min: "12", price: "62" }, { min: "40", price: "54" }, { min: "120", price: "47" }, { min: "300", price: "41" }]),
    receipt: "", status: "live",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) f.set(k, v);
  return f;
}

describe("admin drop form", () => {
  it("accepts a sound live drop and derives close and ship-by", () => {
    const r = parseDropForm(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.values.status).toBe("live");
    expect(r.input.values.tiers[0]).toEqual({ min: 12, priceCents: 6200 });
    expect(r.input.values.closesAt.getTime() - r.input.values.opensAt.getTime()).toBe(72 * 3600_000);
  });
  it("refuses a window longer than a card hold lasts", () => {
    const r = parseDropForm(form({ windowHours: "200" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.windowHours).toMatch(/At most 144 hours/);
  });
  it("refuses an unreachable first tier and a missing factory", () => {
    const r = parseDropForm(form({ tiers: JSON.stringify([{ min: "40", price: "62" }, { min: "80", price: "54" }]), origin: "" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.tiers).toMatch(/25 or fewer/);
      expect(r.errors.origin).toMatch(/Bylaw 3/);
    }
  });
  it("reads cost-sheet lines and marks our fee", () => {
    const { lines, errors } = parseReceipt("Blank | 9.10\nQUORUM fee, 8% | 1.84 | ours\nbroken line");
    expect(errors).toHaveLength(1);
    expect(lines).toEqual([{ label: "Blank", cents: 910 }, { label: "QUORUM fee, 8%", cents: 184, note: "ours", ours: true }]);
  });
});
