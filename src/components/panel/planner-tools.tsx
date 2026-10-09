"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Lock, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyPreviousWeek, generateWeek } from "@/app/panel/actions";
import { useQuickLog } from "./quick-log";

export function PlannerTools({ weekStart, isPro, hasSessions }: { weekStart: string; isPro: boolean; hasSessions: boolean }) {
  const router = useRouter();
  const { open } = useQuickLog();
  const [pendingCopy, startCopy] = useTransition();
  const [pendingGen, startGen] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, start: typeof startCopy) {
    start(async () => {
      const res = await fn();
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => open({ mode: "plan", date: weekStart })} size="sm"><Plus /> Añadir sesión</Button>
      {isPro ? (
        <>
          <Button variant="secondary" size="sm" loading={pendingGen} disabled={hasSessions} title={hasSessions ? "La semana ya tiene sesiones" : undefined}
            onClick={() => run(() => generateWeek(weekStart), startGen)}>
            <Sparkles /> Generar semana sugerida
          </Button>
          <Button variant="secondary" size="sm" loading={pendingCopy} onClick={() => run(() => copyPreviousWeek(weekStart), startCopy)}>
            <Copy /> Copiar semana anterior
          </Button>
        </>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href="/panel/suscripcion"><Lock /> Generar y copiar semanas con Pro</Link>
        </Button>
      )}
    </div>
  );
}
