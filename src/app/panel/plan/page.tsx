import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { addDaysISO, formatWeekRange, isValidISODate, startOfWeekISO, todayISO } from "@/lib/dates";
import { PLAN_LIMITS, SESSION_TYPES } from "@/lib/constants";
import { summarizeWeek } from "@/lib/stats";
import type { TrainingSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlannerBoard } from "@/components/panel/planner-board";
import { PlannerTools } from "@/components/panel/planner-tools";

export const metadata: Metadata = { title: "Planificador" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const { supabase, isPro, prefs } = await requireOnboardedAccount();
  const today = todayISO();
  const currentWeek = startOfWeekISO(today);
  const requested = semana && isValidISODate(semana) ? startOfWeekISO(semana) : currentWeek;
  const historyLimit = addDaysISO(currentWeek, -7 * ((isPro ? PLAN_LIMITS.pro.historyWeeks : PLAN_LIMITS.free.historyWeeks) - 1));
  const futureLimit = addDaysISO(currentWeek, 7 * 12);
  const weekStart = requested < historyLimit ? historyLimit : requested > futureLimit ? futureLimit : requested;
  const lockedPast = requested < historyLimit && !isPro;

  const { data } = await supabase
    .from("training_sessions")
    .select("*, session_exercises(*)")
    .gte("session_date", weekStart)
    .lt("session_date", addDaysISO(weekStart, 7))
    .order("session_date")
    .order("created_at");
  const sessions = (data ?? []) as TrainingSession[];
  const summary = summarizeWeek(sessions, weekStart);
  const personal = sessions.filter((s) => s.session_type !== "equipo" && s.session_type !== "partido").length;
  const prev = addDaysISO(weekStart, -7);
  const next = addDaysISO(weekStart, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planificador</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organiza tu semana alrededor del equipo y del partido.</p>
        </div>
        <nav aria-label="Cambiar de semana" className="flex items-center gap-1">
          {prev >= historyLimit ? (
            <Button asChild variant="outline" size="icon-sm"><Link href={`/panel/plan?semana=${prev}`} aria-label="Semana anterior"><ChevronLeft /></Link></Button>
          ) : (
            <Button variant="outline" size="icon-sm" disabled aria-label="Semana anterior no disponible"><ChevronLeft /></Button>
          )}
          <div className="min-w-40 text-center text-sm font-medium tabular">{formatWeekRange(weekStart)}</div>
          {next <= futureLimit ? (
            <Button asChild variant="outline" size="icon-sm"><Link href={`/panel/plan?semana=${next}`} aria-label="Semana siguiente"><ChevronRight /></Link></Button>
          ) : (
            <Button variant="outline" size="icon-sm" disabled aria-label="Semana siguiente no disponible"><ChevronRight /></Button>
          )}
          {weekStart !== currentWeek && (
            <Button asChild variant="ghost" size="sm"><Link href="/panel/plan">Hoy</Link></Button>
          )}
        </nav>
      </div>

      {lockedPast && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <Lock className="size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">El plan gratuito muestra las últimas {PLAN_LIMITS.free.historyWeeks} semanas. Con Pro accedes a tu historial de hasta 12 meses. <Link href="/panel/suscripcion" className="text-primary hover:underline">Ver Pro</Link></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Sesiones", `${summary.completed} / ${summary.planned}`, "completadas"],
          ["Minutos", String(summary.minutes), "completados"],
          ["Descansos", String(summary.rested), "días marcados"],
          isPro ? ["Sesiones personales", String(personal), "sin límite (Pro)"] : ["Sesiones personales", `${personal} / ${PLAN_LIMITS.free.weeklyPersonalSessions}`, "límite del plan gratuito"],
        ].map(([k, v, h]) => (
          <Card key={k} className="p-4">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-1 text-xl font-semibold tabular">{v}</p>
            <p className="text-[11px] text-muted-foreground">{h}</p>
          </Card>
        ))}
      </div>

      <PlannerTools weekStart={weekStart} isPro={isPro} hasSessions={sessions.length > 0} />

      <PlannerBoard weekStart={weekStart} sessions={sessions} today={today} matchDay={prefs.match_day} />

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Leyenda de tipos de sesión">
        {Object.entries(SESSION_TYPES).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: v.color }} />{v.label}</span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Evita las sesiones físicas intensas la víspera del partido y adapta la carga a tu estado y a las indicaciones de tu entrenador. Los días sin sesión son días de descanso.
      </p>
    </div>
  );
}
