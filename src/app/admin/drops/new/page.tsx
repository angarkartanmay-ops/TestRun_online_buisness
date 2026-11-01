import { DropForm } from "@/components/drop-form";
import { rules } from "@/lib/rules";

export default function NewDropPage() {
  const opens = new Date();
  opens.setUTCMinutes(0, 0, 0);
  return (
    <div className="grid gap-8">
      <h1 className="display text-5xl">New drop</h1>
      <DropForm
        initial={{
          brand: "", item: "", slug: "", blurb: "", spec: "", category: "apparel", glyph: "tshirt", plate: "sage", imageUrl: "",
          retail: "", origin: "", opensAt: opens.toISOString().slice(0, 16), windowHours: String(rules.defaultWindowHours), shipDays: "21", resaleIndex: "",
          // Tiers where the factory price drops: small batch, then bulk.
          tiers: [{ min: "15", price: "", cost: "" }, { min: "50", price: "", cost: "" }, { min: "100", price: "", cost: "" }],
          receipt: "", status: "draft", locked: false,
          kind: "house", hostShare: String(rules.houseHostShareBps / 100), sizes: "XS, S, M, L, XL, XXL", countryOfOrigin: "India", practice: false,
        }}
      />
    </div>
  );
}
