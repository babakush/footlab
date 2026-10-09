"use client";

import { Plus } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useQuickLog } from "./quick-log";

export function QuickLogButton({ label = "Registrar entrenamiento", ...props }: ButtonProps & { label?: string }) {
  const { open } = useQuickLog();
  return (
    <Button onClick={() => open({ mode: "log" })} {...props}>
      <Plus /> {label}
    </Button>
  );
}
