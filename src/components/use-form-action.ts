"use client";

import { startTransition, useActionState } from "react";

/**
 * useActionState without React 19's automatic form reset. Passing a server action
 * to <form action> resets the form when the action settles — even when it returns
 * validation errors — which wipes typed answers and snaps <select>s back to their
 * first option. Submitting through onSubmit + a transition keeps what people typed.
 */
export function useFormAction<S>(action: (prev: Awaited<S>, form: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
