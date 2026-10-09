import type { Metadata } from "next";
import { HeartPulse, Lightbulb } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { addDaysISO, formatNumber, formatShort, todayISO } from "@/lib/dates";
import { hasWarningSymptoms } from "@/lib/stats";
import type { RecoveryLog } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MultiLineChart } from "@/components/panel/charts";
import { HealthWarning } from "@/components/panel/health-warning";
import { RecoveryForm, RecoveryHistory } from "@/components/panel/recovery-form";

export const metadata: Metadata = { title: "Recuperación" };

function avg(values: (number | null)[]) {
  const v = values.filter((x): x is number => x != null).map(Number);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Recordatorios prudentes basados en los datos del usuario. Nunca diagnostican. */
function reminders(logs: RecoveryLog[], today: string): string[] {
  const out: string[] = [];
  const last7 = logs.filter((l) => l.log_date > addDaysISO(today, -7));
  const sleep = avg(last7.map((l) => l.sleep_hours));
  if (sleep !== null && last7.filter((l) => l.sleep_hours != null).length >= 3 && sleep < 7) {
    out.push(`Esta semana has dormido de media ${formatNumber(sleep, 1)} h. Intenta mantener horarios regulares de sueño, sobre todo antes de los partidos.`);
  }
  const recentFatigue = logs.slice(0, 3).filter((l) => (l.muscle_fatigue ?? 0) >= 4);
  if (recentFatigue.length >= 2) out.push("Has indicado fatiga muscular alta varios días. Valora una sesión suave o un día de descanso y coméntalo con tu entrenador.");
  const energy = avg(last7.map((l) => l.energy));
  if (energy !== null && energy <= 2) out.push("Tu energía percibida está baja estos días. Prioriza el descanso, la alimentación y la hidratación.");
  const hydration = avg(last7.map((l) => l.hydration_liters));
  if (hydration !== null && hydration < 1.5) out.push("Tu hidratación aproximada parece baja. Bebe agua de forma regular, especialmente en los días de entrenamiento.");
  return out;
}

export default async function RecoveryPage() {
  const { supabase } = await requireOnboardedAccount();
  const today = todayISO();
  const { data } = await supabase
    .from("daily_recovery_logs")
    .select("*")
    .gte("log_date", addDaysISO(today, -27))
    .order("log_date", { ascending: false });
  const logs = (data ?? []) as RecoveryLog[];
  const todayLog = logs.find((l) => l.log_date === today) ?? null;
  const chartData = [...logs].reverse().map((l) => ({
    label: formatShort(l.log_date),
    sleep_quality: l.sleep_quality,
    energy: l.energy,
    muscle_fatigue: l.muscle_fatigue,
    motivation: l.motivation,
  }));
  const sleepData = [...logs].reverse().map((l) => ({ label: formatShort(l.log_date), sleep_hours: l.sleep_hours != null ? Number(l.sleep_hours) : null }));
  const tips = reminders(logs, today);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hábitos y recuperación</h1>
        <p className="mt-1 text-sm text-muted-foreground">Un registro diario opcional. Tarda menos de 30 segundos.</p>
      </div>

      <HealthWarning log={todayLog} show={hasWarningSymptoms(todayLog)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>{todayLog ? "Tu registro de hoy" : "¿Cómo te encuentras hoy?"}</CardTitle>
            <CardDescription>Todos los campos son opcionales.</CardDescription>
          </CardHeader>
          <CardContent><RecoveryForm today={today} logs={logs} /></CardContent>
        </Card>

        <div className="space-y-6">
          {tips.length > 0 && (
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm font-medium"><Lightbulb className="size-4 text-primary" />Recordatorios</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{tips.map((t) => <li key={t}>· {t}</li>)}</ul>
              <p className="mt-3 text-[11px] text-muted-foreground">Basado en tus respuestas. No es un diagnóstico.</p>
            </Card>
          )}
          {logs.length >= 2 ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between"><CardTitle>Tendencias</CardTitle><Badge>Escala 1-5</Badge></div>
                  <CardDescription>Últimos 28 días</CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiLineChart data={chartData} domain={[1, 5]} lines={[
                    { key: "sleep_quality", name: "Sueño", color: "#6cb6ff" },
                    { key: "energy", name: "Energía", color: "#c6f432" },
                    { key: "muscle_fatigue", name: "Fatiga", color: "#f2555a" },
                    { key: "motivation", name: "Motivación", color: "#f5b544" },
                  ]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Horas de sueño</CardTitle></CardHeader>
                <CardContent><MultiLineChart data={sleepData} unit="h" height={180} lines={[{ key: "sleep_hours", name: "Horas", color: "#6cb6ff" }]} /></CardContent>
              </Card>
            </>
          ) : (
            <EmptyState icon={HeartPulse} title="Aún no hay tendencias" description="Registra cómo te sientes durante al menos dos días para ver tus tendencias de sueño, energía y fatiga." />
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Registros recientes</CardTitle></CardHeader>
          <CardContent><RecoveryHistory logs={logs} /></CardContent>
        </Card>
      )}
    </div>
  );
}
