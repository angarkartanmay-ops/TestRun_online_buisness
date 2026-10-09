"use client";

import { SignOut } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { post } from "@/lib/api-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await post("/api/auth/sign-out").catch(() => undefined);
        router.push("/");
        router.refresh();
      }}
    >
      <SignOut size={16} /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
