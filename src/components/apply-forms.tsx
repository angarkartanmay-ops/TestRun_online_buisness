"use client";

import { applyAsBrand, applyToHost, type FormState } from "@/app/actions";
import { Field } from "./form-field";
import { useFormAction } from "./use-form-action";

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-go font-semibold" : "text-stamp"}`}>
      {state.message}
    </p>
  );
}

export function HostApplyForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(applyToHost, null);
  if (state?.ok) return <Status state={state} />;
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <Field id="groupName" label="Your group" error={e.groupName} hint="The batch, club, society, fest crew or friend group.">
        <input id="groupName" name="groupName" className="field" placeholder="Batch of '27, Mechanical" aria-invalid={e.groupName ? true : undefined} />
      </Field>
      <Field id="groupSize" label="People in it" error={e.groupSize}>
        <input id="groupSize" name="groupSize" type="number" inputMode="numeric" className="field" placeholder="120" aria-invalid={e.groupSize ? true : undefined} />
      </Field>
      <Field id="brief" label="One thing they'd buy, and at what price" error={e.brief} hint='An item, not a category: "a navy batch hoodie with our year on the sleeve, around ₹900".'>
        <textarea id="brief" name="brief" className="field" aria-invalid={e.brief ? true : undefined} />
      </Field>
      <Status state={state} />
      <button className="btn btn-stamp justify-self-start" disabled={pending}>
        {pending ? "Sending…" : "Apply to host"}
      </button>
    </form>
  );
}

export function BrandApplyForm() {
  const [state, onSubmit, pending] = useFormAction<FormState>(applyAsBrand, null);
  if (state?.ok) return <Status state={state} />;
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        <Field id="brand" label="Brand" error={e.brand}>
          <input id="brand" name="brand" className="field" aria-invalid={e.brand ? true : undefined} />
        </Field>
        <Field id="email" label="Email" error={e.email}>
          <input id="email" name="email" type="email" autoComplete="email" className="field" aria-invalid={e.email ? true : undefined} />
        </Field>
      </div>
      <Field id="item" label="The item" error={e.item}>
        <input id="item" name="item" className="field" placeholder="240 GSM oversized tee, 2-colour print" aria-invalid={e.item ? true : undefined} />
      </Field>
      <Field id="factory" label="Factory and city" error={e.factory} hint="Required. Every drop names its maker.">
        <input id="factory" name="factory" className="field" placeholder="Knit + printed in Tiruppur, Tamil Nadu" aria-invalid={e.factory ? true : undefined} />
      </Field>
      <Field id="unitCost" label="Landed unit cost at 300 units (optional)" error={e.unitCost} hint="In rupees, including delivery. Helps us propose a ladder you can actually hit.">
        <input id="unitCost" name="unitCost" type="number" step="0.01" inputMode="decimal" className="field" aria-invalid={e.unitCost ? true : undefined} />
      </Field>
      <Field id="notes" label="Anything else" error={e.notes}>
        <textarea id="notes" name="notes" className="field" />
      </Field>
      <Status state={state} />
      <button className="btn btn-stamp justify-self-start" disabled={pending}>
        {pending ? "Sending…" : "Propose a drop"}
      </button>
    </form>
  );
}
