"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { saveDrop, type DropFormState } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/drop-input";
import { CURRENCY } from "@/lib/money";
import { rules } from "@/lib/rules";
import { tierMargins, validateTiers } from "@/lib/tiers";
import { Field } from "./form-field";
import { Ladder } from "./ladder";
import { useFormAction } from "./use-form-action";

export type DropFormValues = {
  id?: string;
  brand: string; item: string; slug: string; blurb: string; spec: string; category: string; glyph: string; plate: string;
  imageUrl: string; retail: string; origin: string; opensAt: string; windowHours: string; shipDays: string; resaleIndex: string;
  tiers: { min: string; price: string; cost: string }[]; receipt: string; status: "draft" | "live"; locked: boolean;
  kind: "house" | "partner"; hostShare: string; sizes: string; countryOfOrigin: string; practice: boolean;
};

const SYMBOL = CURRENCY === "inr" ? "₹" : CURRENCY === "gbp" ? "£" : CURRENCY === "eur" ? "€" : "$";

const GLYPHS = ["tshirt", "hoodie", "pants", "coat", "yarn", "sneaker", "headphones", "keyboard", "eyeglasses", "watch", "tote", "backpack", "coffee", "package"];
const PLATES = ["sage", "cobalt", "smoke", "mint", "butter", "clay", "stone", "rust"];
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export function DropForm({ initial }: { initial: DropFormValues }) {
  const [state, onSubmit, pending] = useFormAction<DropFormState>(saveDrop, null);
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const e = state?.errors ?? {};
  const set = (k: keyof DropFormValues) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const next = { ...v, [k]: ev.target.value };
    if (!slugTouched && (k === "brand" || k === "item")) next.slug = slugify(`${next.brand} ${next.item}`);
    setV(next);
  };

  const house = v.kind === "house";
  const hostShareBps = Math.round((Number(v.hostShare) || 0) * 100);
  const tiers = useMemo(
    () =>
      v.tiers.map((t) => ({
        min: Math.round(Number(t.min) || 0),
        priceCents: Math.round((Number(t.price) || 0) * 100),
        ...(t.cost.trim() !== "" ? { costCents: Math.round((Number(t.cost) || 0) * 100) } : {}),
      })),
    [v.tiers],
  );
  const retailCents = Math.round((Number(v.retail) || 0) * 100);
  const tierProblems = validateTiers(tiers, retailCents, rules.maxFirstTierMembers, { kind: v.kind, hostShareBps });
  const margins = house ? tierMargins(tiers, hostShareBps) : [];
  const L = v.locked;

  return (
    <form onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-12" noValidate>
      {v.id ? <input type="hidden" name="id" value={v.id} /> : null}
      <input type="hidden" name="tiers" value={JSON.stringify(v.tiers)} />

      <div className="lg:col-span-7 grid gap-6 content-start">
        <div className="grid sm:grid-cols-2 gap-5">
          <Field id="brand" label="Brand" error={e.brand}>
            <input id="brand" name="brand" className="field" value={v.brand} onChange={set("brand")} />
          </Field>
          <Field id="item" label="Item" error={e.item}>
            <input id="item" name="item" className="field" value={v.item} onChange={set("item")} />
          </Field>
        </div>
        <Field id="slug" label="Address" error={e.slug} hint={`/drops/${v.slug || "…"}`}>
          <input id="slug" name="slug" className="field" value={v.slug} readOnly={L} onChange={(ev) => { setSlugTouched(true); set("slug")(ev); }} />
        </Field>
        <Field id="blurb" label="Blurb" error={e.blurb} hint="One or two sentences. Specific beats clever.">
          <textarea id="blurb" name="blurb" className="field" value={v.blurb} onChange={set("blurb")} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field id="spec" label="Spec line" error={e.spec}>
            <input id="spec" name="spec" className="field" value={v.spec} onChange={set("spec")} placeholder="240 GSM combed cotton · oversized" />
          </Field>
          <Field id="origin" label="Made (factory, city, state)" error={e.origin}>
            <input id="origin" name="origin" className="field" value={v.origin} onChange={set("origin")} placeholder="Knit + printed in Tiruppur, Tamil Nadu" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field id="countryOfOrigin" label="Country of origin" error={e.countryOfOrigin} hint="Shown on the drop — required by India's e-commerce rules.">
            <input id="countryOfOrigin" name="countryOfOrigin" className="field" value={v.countryOfOrigin} onChange={set("countryOfOrigin")} />
          </Field>
          <Field id="sizes" label="Sizes members pick from" error={e.sizes} hint="Comma-separated, e.g. S, M, L, XL. Leave empty for one size.">
            <input id="sizes" name="sizes" className="field" value={v.sizes} readOnly={L} onChange={set("sizes")} placeholder="XS, S, M, L, XL, XXL" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          <Field id="category" label="Category" error={e.category}>
            <select id="category" name="category" className="field" value={v.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field id="glyph" label="Plate glyph">
            <select id="glyph" name="glyph" className="field" value={v.glyph} onChange={set("glyph")}>
              {GLYPHS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field id="plate" label="Plate colour">
            <select id="plate" name="plate" className="field" value={v.plate} onChange={set("plate")}>
              {PLATES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field id="imageUrl" label="Product photo URL (optional)" error={e.imageUrl} hint="https:// only. Without one, the drop shows its specimen plate.">
          <input id="imageUrl" name="imageUrl" className="field" value={v.imageUrl} onChange={set("imageUrl")} />
        </Field>
        <Field id="receipt" label="Cost sheet — one line each: Label | 186.00 | note" error={e.receipt} hint='Lines should sum to the price it closes at. Start our own line with "QUORUM".'>
          <textarea id="receipt" name="receipt" className="field min-h-[12rem] font-mono text-sm" value={v.receipt} onChange={set("receipt")} />
        </Field>
      </div>

      <div className="lg:col-span-5 grid gap-6 content-start">
        <fieldset disabled={L} className="grid gap-6 bg-receipt border-2 border-ink p-5 disabled:opacity-80">
          <legend className="label px-1">The ladder{L ? " — locked while live" : ""}</legend>
          <div className="grid grid-cols-2 gap-4">
            <Field id="kind" label="Who makes it">
              <select id="kind" name="kind" className="field" value={v.kind} onChange={set("kind")}>
                <option value="house">We do (house)</option>
                <option value="partner">A brand (partner)</option>
              </select>
            </Field>
            <Field id="hostShare" label="Host / club fund (%)" error={e.hostShare}>
              <input id="hostShare" name="hostShare" type="number" step="0.5" inputMode="decimal" className="field" value={v.hostShare} onChange={set("hostShare")} />
            </Field>
          </div>
          <Field id="retail" label={`Retail price (${SYMBOL})`} error={e.retail} hint="What one person pays for a single custom piece, alone.">
            <input id="retail" name="retail" type="number" step="0.01" inputMode="decimal" className="field" value={v.retail} onChange={set("retail")} />
          </Field>
          <div className="grid gap-2">
            <p className="label text-ink-2">
              Tiers — members → price ({SYMBOL}){house ? ` → unit cost (${SYMBOL}, making + delivery at that quantity)` : ""}
            </p>
            {v.tiers.map((t, i) => (
              <div key={i} className={`grid ${house ? "grid-cols-[1fr_1fr_1fr_auto]" : "grid-cols-[1fr_1fr_auto]"} gap-2`}>
                <input aria-label={`Tier ${i + 1} members`} type="number" inputMode="numeric" className="field" value={t.min} onChange={(ev) => setV({ ...v, tiers: v.tiers.map((x, j) => (j === i ? { ...x, min: ev.target.value } : x)) })} />
                <input aria-label={`Tier ${i + 1} price`} type="number" step="0.01" inputMode="decimal" className="field" value={t.price} onChange={(ev) => setV({ ...v, tiers: v.tiers.map((x, j) => (j === i ? { ...x, price: ev.target.value } : x)) })} />
                {house ? (
                  <input aria-label={`Tier ${i + 1} unit cost`} type="number" step="0.01" inputMode="decimal" className="field" value={t.cost} onChange={(ev) => setV({ ...v, tiers: v.tiers.map((x, j) => (j === i ? { ...x, cost: ev.target.value } : x)) })} />
                ) : null}
                <button type="button" aria-label={`Remove tier ${i + 1}`} className="btn btn-sm btn-ghost px-3" disabled={v.tiers.length <= 2} onClick={() => setV({ ...v, tiers: v.tiers.filter((_, j) => j !== i) })}>
                  <Minus size={16} />
                </button>
              </div>
            ))}
            {house && margins.some((m) => tiers[m.index]?.costCents) ? (
              <p className="font-mono text-xs text-ink-2">
                Margin after GST, gateway, club fund and cost:{" "}
                {margins.map((m) => `T${m.index + 1} ${(m.marginBps / 100).toFixed(1)}%`).join(" · ")} — keep each ≥ {rules.minMarginBps / 100}%.
              </p>
            ) : null}
            <button type="button" className="btn btn-sm btn-ghost justify-self-start" disabled={v.tiers.length >= 6} onClick={() => setV({ ...v, tiers: [...v.tiers, { min: "", price: "", cost: "" }] })}>
              <Plus size={16} /> Add tier
            </button>
            {tierProblems.length ? (
              <ul className="text-sm text-stamp list-disc pl-5">{tierProblems.map((p) => <li key={p}>{p}</li>)}</ul>
            ) : (
              <div className="pt-2"><Ladder tiers={tiers} members={0} unlockedTier={-1} /></div>
            )}
            {e.tiers && !tierProblems.length ? <p className="text-sm text-stamp">{e.tiers}</p> : null}
          </div>
          <Field id="opensAt" label="Opens (UTC)" error={e.opensAt}>
            <input id="opensAt" name="opensAt" type="datetime-local" className="field" value={v.opensAt} onChange={set("opensAt")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="windowHours" label="Window (hours)" error={e.windowHours} hint={`Max ${rules.maxWindowHours}`}>
              <input id="windowHours" name="windowHours" type="number" className="field" value={v.windowHours} onChange={set("windowHours")} />
            </Field>
            <Field id="shipDays" label="Ships within (days)" error={e.shipDays}>
              <input id="shipDays" name="shipDays" type="number" className="field" value={v.shipDays} onChange={set("shipDays")} />
            </Field>
          </div>
        </fieldset>
        {L ? (
          <>
            <input type="hidden" name="retail" value={v.retail} />
            <input type="hidden" name="opensAt" value={v.opensAt} />
            <input type="hidden" name="windowHours" value={v.windowHours} />
            <input type="hidden" name="shipDays" value={v.shipDays} />
            <input type="hidden" name="kind" value={v.kind} />
            <input type="hidden" name="hostShare" value={v.hostShare} />
          </>
        ) : null}
        <Field id="resaleIndex" label="Resale index (optional)" error={e.resaleIndex} hint="Secondhand median ÷ retail, last 90 days.">
          <input id="resaleIndex" name="resaleIndex" type="number" step="0.01" className="field" value={v.resaleIndex} onChange={set("resaleIndex")} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="practice" className="mt-1 w-4 h-4" checked={v.practice} disabled={L} onChange={(ev) => setV({ ...v, practice: ev.target.checked })} />
          <span>
            <b>Practice drop</b> — labelled as practice on the site, and nobody pays, whatever the server&apos;s payment setup. Use it to show friends how a drop works.
          </span>
        </label>
        {L && v.practice ? <input type="hidden" name="practice" value="on" /> : null}
        <Field id="status" label="Status">
          <select id="status" name="status" className="field" value={v.status} onChange={set("status")} disabled={L}>
            <option value="draft">Draft — only admins can see it</option>
            <option value="live">Live — members can join</option>
          </select>
        </Field>
        {L ? <input type="hidden" name="status" value="live" /> : null}
        {state ? <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-go font-semibold" : "text-stamp"}`}>{state.message}</p> : null}
        <button className="btn btn-stamp" disabled={pending}>
          {pending ? "Saving…" : v.id ? "Save drop" : "Create drop"}
        </button>
      </div>
    </form>
  );
}
