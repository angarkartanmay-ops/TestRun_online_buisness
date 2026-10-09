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
          retail: "", origin: "", opensAt: opens.toISOString().slice(0, 16), windowHours: String(rules.defaultWindowHours), shipDays: "42", resaleIndex: "",
          tiers: [{ min: "10", price: "" }, { min: "60", price: "" }, { min: "180", price: "" }, { min: "400", price: "" }],
          receipt: "", status: "draft", locked: false,
        }}
      />
    </div>
  );
}
