import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3, Lock } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { addDaysISO, formatMinutes, formatNumber, formatNumeric, formatShort, startOfWeekISO, todayISO } from "@/lib/dates";
import { PLAN_LIMITS, SESSION_STATUS, SESSION_TYPES } from "@/lib/constants";
import { byCategory, weeklySeries } from "@/lib/stats";
import type { TrainingSession } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryBars, MultiLineChart, WeeklyBarChart } from "@/components/panel/charts";
import { QuickLogButton } from "@/components/panel/quick-log-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progreso" };

const RANGES = [4, 12, 26, 52] as const;

function Delta({ now, before, unit }: { now: number; before: number; unit?: string }) {
  const diff = now - before;
  if (!before && !now) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("tabular", diff > 0 ? "text-primary" : diff < 0 ? "text-warning" : "text-muted-foreground")}>
      {diff > 0 ? "+" : ""}{formatNumber(diff, 1)}{unit ? ` ${unit}` : ""}
    </span>
  );
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ semanas?: string }> }) {
  const sp = await searchParams;
  const { supabase, isPro } = await requireOnboardedAccount();
  const today = todayISO();
  const requested = Number(sp.semanas) as (typeof RANGES)[number];
  // El rango se limita en el servidor según el plan verificado.
  const weeks = isPro ? (RANGES.includes(requested) ? requested : 12) : PLAN_LIMITS.free.historyWeeks;
  const start = addDaysISO(startOfWeekISO(today), -7 * (weeks - 1));

  const { data } = await supabase
    .from("training_sessions")
    .select("id, session_date, session_type, title, status, actual_minutes, rpe, distance_km, planned_minutes")
    .gte("session_date", start)
    .lte("session_date", today)
    .order("session_date", { ascending: false });
  const sessions = (data ?? []) as TrainingSession[];
  const completed = sessions.filter((s) => s.status === "completada");
  const series = weeklySeries(sessions, today, weeks);
  const categories = byCategory(sessions);
  const totalMinutes = completed.reduce((a, s) => a + (s.actual_minutes ?? 0), 0);
  const withRpe = completed.filter((s) => s.rpe);
  const avgRpe = withRpe.length ? withRpe.reduce((a, s) => a + (s.rpe ?? 0), 0) / withRpe.length : null;
  const distance = completed.reduce((a, s) => a + (s.distance_km ? Number(s.distance_km) : 0), 0);
  const thisWeek = series[series.length - 1];
  const lastWeek = series[series.length - 2];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Progreso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Calculado únicamente con los datos que registras.</p>
        </div>
        <nav aria-label="Rango de semanas" className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {RANGES.map((r) => {
            const allowed = isPro || r === PLAN_LIMITS.free.historyWeeks;
            const active = r === weeks;
            return allowed ? (
              <Link key={r} href={`/panel/progreso?semanas=${r}`} aria-current={active ? "page" : undefined}
                className={cn("rounded-md px-3 py-1.5 text-xs", active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {r} sem
              </Link>
            ) : (
              <Link key={r} href="/panel/suscripcion" className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-muted-foreground/60" title="Disponible con Pro">
                <Lock className="size-3" />{r} sem
              </Link>
            );
          })}
        </nav>
      </div>

      {completed.length === 0 ? (
        <EmptyState icon={BarChart3} title="Todavía no hay sesiones completadas"
          description={`Cuando completes sesiones verás aquí tus minutos, sesiones por tipo y tu evolución de las últimas ${weeks} semanas.`}
          action={<QuickLogButton size="sm" />} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Totales del periodo">
            {[
              { k: "Sesiones completadas", v: String(completed.length), h: `en ${weeks} semanas` },
              { k: "Tiempo total", v: formatMinutes(totalMinutes), h: "minutos reales" },
              { k: "Esfuerzo medio (RPE)", v: avgRpe ? formatNumber(avgRpe, 1) : "—", h: avgRpe ? `${withRpe.length} sesiones con RPE` : "Sin datos de RPE" },
              { k: "Distancia", v: distance ? `${formatNumber(distance, 1)} km` : "—", h: distance ? "introducida por ti" : "No has introducido distancias" },
            ].map((x) => (
              <Card key={x.k} className="p-4">
                <p className="text-xs text-muted-foreground">{x.k}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight tabular">{x.v}</p>
                <p className="text-[11px] text-muted-foreground">{x.h}</p>
              </Card>
            ))}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between"><CardTitle>Minutos por semana</CardTitle><Badge>Datos introducidos</Badge></div>
                <CardDescription>Suma de la duración real de las sesiones completadas</CardDescription>
              </CardHeader>
              <CardContent><WeeklyBarChart name="Minutos" unit="min" dataKey="minutes" data={series.map((w) => ({ label: formatShort(w.weekStart), minutes: w.minutes }))} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between"><CardTitle>Sesiones por semana</CardTitle><Badge>Datos introducidos</Badge></div>
                <CardDescription>Sesiones marcadas como completadas</CardDescription>
              </CardHeader>
              <CardContent><WeeklyBarChart name="Sesiones" dataKey="completed" data={series.map((w) => ({ label: formatShort(w.weekStart), completed: w.completed }))} /></CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Minutos por tipo de sesión</CardTitle>
                <CardDescription>Distribución del trabajo completado en el periodo</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBars data={categories.map((c) => ({ name: SESSION_TYPES[c.type].short, minutes: c.minutes, color: SESSION_TYPES[c.type].color }))} />
              </CardContent>
            </Card>

            {isPro ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle>Carga semanal estimada</CardTitle><Badge variant="warning">Estimación</Badge></div>
                  <CardDescription>Minutos × esfuerzo percibido (sRPE). Solo sesiones con RPE; orientativo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiLineChart data={series.map((w) => ({ label: formatShort(w.weekStart), load: w.load || null }))} lines={[{ key: "load", name: "Carga (UA)", color: "#c6f432" }]} />
                </CardContent>
              </Card>
            ) : (
              <Card className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <Lock className="size-5 text-primary" />
                <p className="font-medium">Estadísticas avanzadas</p>
                <p className="max-w-xs text-sm text-muted-foreground">Carga semanal estimada, comparativa entre semanas e historial de hasta 12 meses con el plan Pro.</p>
                <Button asChild size="sm"><Link href="/panel/suscripcion">Ver Pro</Link></Button>
              </Card>
            )}
          </div>

          {isPro && lastWeek && (
            <Card>
              <CardHeader><CardTitle>Esta semana frente a la anterior</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-96 text-sm">
                  <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2 font-normal">Métrica</th><th className="pb-2 font-normal">Anterior</th><th className="pb-2 font-normal">Actual</th><th className="pb-2 font-normal">Cambio</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="py-2">Sesiones</td><td className="tabular">{lastWeek.completed}</td><td className="tabular">{thisWeek.completed}</td><td><Delta now={thisWeek.completed} before={lastWeek.completed} /></td></tr>
                    <tr><td className="py-2">Minutos</td><td className="tabular">{lastWeek.minutes}</td><td className="tabular">{thisWeek.minutes}</td><td><Delta now={thisWeek.minutes} before={lastWeek.minutes} unit="min" /></td></tr>
                    <tr><td className="py-2">RPE medio</td><td className="tabular">{lastWeek.avgRpe ? formatNumber(lastWeek.avgRpe, 1) : "—"}</td><td className="tabular">{thisWeek.avgRpe ? formatNumber(thisWeek.avgRpe, 1) : "—"}</td><td><Delta now={thisWeek.avgRpe ?? 0} before={lastWeek.avgRpe ?? 0} /></td></tr>
                    <tr><td className="py-2">Carga estimada</td><td className="tabular">{lastWeek.load}</td><td className="tabular">{thisWeek.load}</td><td><Delta now={thisWeek.load} before={lastWeek.load} /></td></tr>
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-muted-foreground">Un aumento brusco de carga de una semana a otra puede aumentar la fatiga. Progresa de forma gradual.</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Historial</CardTitle><CardDescription>Sesiones de las últimas {weeks} semanas</CardDescription></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-normal">Fecha</th><th className="pb-2 font-normal">Sesión</th><th className="pb-2 font-normal">Estado</th><th className="pb-2 text-right font-normal">Min</th><th className="pb-2 text-right font-normal">RPE</th><th className="pb-2 text-right font-normal">Km</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 tabular text-muted-foreground">{formatNumeric(s.session_date)}</td>
                      <td className="py-2"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: SESSION_TYPES[s.session_type].color }} />{s.title}</td>
                      <td className="py-2 text-muted-foreground">{SESSION_STATUS[s.status]}</td>
                      <td className="py-2 text-right tabular">{s.actual_minutes ?? "—"}</td>
                      <td className="py-2 text-right tabular">{s.rpe ?? "—"}</td>
                      <td className="py-2 text-right tabular">{s.distance_km ? formatNumber(Number(s.distance_km), 2) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
