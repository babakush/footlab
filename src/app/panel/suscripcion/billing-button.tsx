"use client";

import { useActionState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { BillingState } from "./actions";

export function BillingButton({ action, children, ...props }: ButtonProps & { action: () => Promise<BillingState> }) {
  const [state, formAction, pending] = useActionState(async () => action(), undefined);
  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" loading={pending} {...props}>{children}</Button>
      {state?.error && <p role="alert" className="text-center text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
