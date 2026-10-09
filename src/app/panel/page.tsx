import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, Flame, HeartPulse, Timer, Trophy } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { addDaysISO, formatLong, formatMinutes, formatShort, formatWeekRange, relativeDayLabel, startOfWeekISO, todayISO, TIME_ZONE } from "@/lib/dates";
import { GOALS, PLAN_LIMITS, POSITIONS, SESSION_TYPES, WEEKDAYS } from "@/lib/constants";
import { recoveryLabel, recoveryScore, summarizeWeek, weeklySeries, weeklyStreak, hasWarningSymptoms } from "@/lib/stats";
import type { RecoveryLog, TrainingSession } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WeekCalendar } from "@/components/panel/week-calendar";
import { WeeklyBarChart } from "@/components/panel/charts";
import { SessionCard } from "@/components/panel/session-card";
import { QuickLogButton } from "@/components/panel/quick-log-button";
import { HealthWarning } from "@/components/panel/health-warning";
import { WelcomeToast } from "@/components/panel/welcome-toast";

export const metadata: Metadata = { title: "Inicio" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", hour12: false, timeZone: TIME_ZONE }).format(new Date()));
  if (hour >= 6 && hour < 14) return "Buenos días";
  if (hour >= 14 && hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ bienvenida?: string; aviso?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile, prefs, isPro } = await requireOnboardedAccount();
  const today = todayISO();
  const weekStart = startOfWeekISO(today);
  const chartWeeks = isPro ? 8 : PLAN_LIMITS.free.historyWeeks;
  const rangeStart = addDaysISO(weekStart, -7 * (chartWeeks - 1));

  const [sessionsRes, streakRes, recoveryRes, matchRes] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("*, session_exercises(*)")
      .gte("session_date", rangeStart)
      .lt("session_date", addDaysISO(weekStart, 7))
      .order("session_date")
      .order("created_at"),
    supabase
      .from("training_sessions")
      .select("session_date, status")
      .eq("status", "completada")
      .gte("session_date", addDaysISO(weekStart, -7 * 52)),
    supabase.from("daily_recovery_logs").select("*").gte("log_date", addDaysISO(today, -2)).order("log_date", { ascending: false }).limit(1),
    supabase.from("training_sessions").select("session_date, title").eq("session_type", "partido").gte("session_date", today).order("session_date").limit(1),
  ]);

  const sessions = (sessionsRes.data ?? []) as TrainingSession[];
  const weekSessions = sessions.filter((s) => s.session_date >= weekStart);
  const todaySessions = weekSessions.filter((s) => s.session_date === today);
  const week = summarizeWeek(sessions, weekStart);
  const series = weeklySeries(sessions, today, chartWeeks);
  const streakTarget = prefs.weekly_sessions_target ?? 2;
  const streak = weeklyStreak((streakRes.data ?? []) as TrainingSession[], today, streakTarget);
  const lastLog = (recoveryRes.data?.[0] ?? null) as RecoveryLog | null;
  const score = recoveryScore(lastLog);
  const nextMatch = matchRes.data?.[0] as { session_date: string; title: string } | undefined;
  const totalTarget = prefs.weekly_sessions_target ?? Math.max(week.planned, 1);
  const hasAnyData = sessions.length > 0;

  return (
    <div className="space-y-6">
      <WelcomeToast welcome={sp.bienvenida === "1"} passwordChanged={sp.aviso === "password"} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
        <div>
          <p className="text-sm text-muted-foreground">{formatLong(today)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{greeting()}, {profile.display_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {POSITIONS[prefs.position]} · Objetivo: {GOALS[prefs.goal].toLowerCase()}
          </p>
        </div>
        <QuickLogButton className="hidden sm:inline-flex" />
      </div>

      <HealthWarning log={lastLog} show={hasWarningSymptoms(lastLog)} />

      {/* Resumen semanal */}
      <section aria-label="Resumen de la semana" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Sesiones completadas</span><Trophy className="size-4" /></div>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{week.completed}<span className="text-base font-normal text-muted-foreground"> / {totalTarget}</span></p>
          <Progress value={(week.completed / totalTarget) * 100} className="mt-3" label="Sesiones completadas esta semana" />
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Minutos esta semana</span><Timer className="size-4" /></div>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{week.minutes}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {prefs.weekly_minutes_target ? `Objetivo: ${prefs.weekly_minutes_target} min` : week.minutes ? formatMinutes(week.minutes) : "Sin registros aún"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Racha de constancia</span><Flame className="size-4" /></div>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular">{streak}<span className="ml-1 text-base font-normal text-muted-foreground">{streak === 1 ? "semana" : "semanas"}</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Semanas con ≥ {streakTarget} sesiones completadas</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Recuperación subjetiva</span><HeartPulse className="size-4" /></div>
          {score !== null ? (
            <>
              <p className="mt-3 flex items-baseline gap-2 text-3xl font-semibold tracking-tight tabular">
                {score}<Badge variant={recoveryLabel(score).tone}>{recoveryLabel(score).label}</Badge>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Estimación según tu registro del {formatShort(lastLog!.log_date)}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted-foreground">Sin registro reciente</p>
              <Link href="/panel/recuperacion" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">¿Cómo te sientes hoy? <ArrowRight className="size-3" /></Link>
            </>
          )}
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Semana */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Tu semana</CardTitle>
              <CardDescription>{formatWeekRange(weekStart)}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/panel/plan">Planificador <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent>
            <WeekCalendar weekStart={weekStart} sessions={weekSessions} today={today} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Hoy */}
          <Card>
            <CardHeader><CardTitle>Entrenamiento de hoy</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {todaySessions.length ? (
                todaySessions.map((s) => <SessionCard key={s.id} session={s} today={today} compact />)
              ) : (
                <div className="space-y-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <p>No tienes nada programado para hoy.</p>
                  <QuickLogButton variant="secondary" size="sm" label="Registrar un entrenamiento" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximo partido */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-border" style={{ color: SESSION_TYPES.partido.color }}>
                <CalendarClock className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Próximo partido</p>
                {nextMatch ? (
                  <p className="truncate font-medium">{relativeDayLabel(nextMatch.session_date, today)} · {formatLong(nextMatch.session_date).toLowerCase()}</p>
                ) : prefs.match_day ? (
                  <p className="font-medium">Sin partido planificado <span className="font-normal text-muted-foreground">· habitual: {WEEKDAYS[prefs.match_day - 1].label.toLowerCase()}</span></p>
                ) : (
                  <p className="font-medium">Sin partido planificado</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Evolución */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Evolución semanal</CardTitle>
            <CardDescription>Minutos de entrenamiento completados · últimas {chartWeeks} semanas</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/panel/progreso">Ver progreso <ArrowRight /></Link></Button>
        </CardHeader>
        <CardContent>
          {hasAnyData && series.some((w) => w.minutes > 0) ? (
            <WeeklyBarChart name="Minutos" unit="min" dataKey="minutes" data={series.map((w) => ({ label: formatShort(w.weekStart), minutes: w.minutes }))} />
          ) : (
            <div className="grid h-40 place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
              <p className="max-w-xs">Cuando completes tus primeras sesiones verás aquí tu evolución semanal.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
