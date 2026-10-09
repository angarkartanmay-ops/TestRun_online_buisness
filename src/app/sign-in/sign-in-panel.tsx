"use client";

import { useRouter } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";

export function SignInPanel({ next }: { next: string }) {
  const router = useRouter();
  return (
    <SignInForm
      onSignedIn={() => {
        router.push(next);
        router.refresh();
      }}
    />
  );
}
