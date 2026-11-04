"use client";

import type { FormState } from "@/app/actions";
import { createWantAction } from "@/app/wants/actions";
import { WANT_CATEGORIES, WANT_CITIES } from "@/lib/wants";
import { Field } from "./form-field";
import { useFormAction } from "./use-form-action";

export function WantForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(createWantAction, null);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="brand" label="Brand" error={e.brand}>
          <input id="brand" name="brand" className="field" placeholder="Nike" aria-invalid={e.brand ? true : undefined} />
        </Field>
        <Field id="item" label="Item" error={e.item} hint="A model, not a category.">
          <input id="item" name="item" className="field" placeholder="Pegasus 41" aria-invalid={e.item ? true : undefined} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="city" label="Your city" error={e.city}>
          <select id="city" name="city" className="field" defaultValue="Bengaluru">
            {WANT_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field id="category" label="Category" error={e.category}>
          <select id="category" name="category" className="field" defaultValue="apparel">
            {WANT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field id="maxPrice" label="The most you'd pay, in ₹ (optional)" error={e.maxPrice} hint="Brands use this to see what price works.">
        <input id="maxPrice" name="maxPrice" type="number" inputMode="numeric" className="field" aria-invalid={e.maxPrice ? true : undefined} />
      </Field>
      <Field id="note" label="Anything else (optional)" error={e.note}>
        <textarea id="note" name="note" className="field" />
      </Field>
      {state ? <p role="alert" className="text-sm text-stamp">{state.message}</p> : null}
      <button className="btn btn-stamp justify-self-start" disabled={pending}>{pending ? "Posting…" : "Post my request"}</button>
    </form>
  );
}
