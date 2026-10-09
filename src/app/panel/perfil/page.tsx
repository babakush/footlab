import Link from "next/link";
import type { Metadata } from "next";
import { Download, Lock, ShieldCheck } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { addDaysISO, formatNumeric, startOfWeekISO, todayISO } from "@/lib/dates";
import { GOALS, LEVELS, POSITIONS } from "@/lib/constants";
import { weeklySeries } from "@/lib/stats";
import type { PersonalRecord, TrainingSession } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfileForm, TargetsForm, RecordsManager, DeleteAccount, ChangePasswordForm } from "@/components/panel/profile-forms";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { supabase, user, profile, prefs, isPro } = await requireOnboardedAccount();
  const today = todayISO();
  const [recordsRes, recentRes, totalRes] = await Promise.all([
    supabase.from("personal_records").select("*").order("recorded_on", { ascending: false }),
    supabase
      .from("training_sessions")
      .select("session_date, status, actual_minutes, rpe")
      .gte("session_date", addDaysISO(startOfWeekISO(today), -21))
      .lte("session_date", today),
    supabase.from("training_sessions").select("id", { count: "exact", head: true }).eq("status", "completada"),
  ]);
  const records = (recordsRes.data ?? []) as PersonalRecord[];
  const series = weeklySeries((recentRes.data ?? []) as TrainingSession[], today, 4);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground" aria-hidden>
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
            <p className="text-sm text-muted-foreground">{POSITIONS[prefs.position]} · {LEVELS[prefs.level]} · {GOALS[prefs.goal]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPro ? <Badge variant="primary">Plan Pro</Badge> : <Badge>Plan gratuito</Badge>}
          <Badge>{totalRes.count ?? 0} sesiones completadas</Badge>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Progreso semanal</CardTitle><CardDescription>Últimas 4 semanas</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {series.map((w) => (
              <div key={w.weekStart} className="rounded-lg border border-border p-3">
                <p className="text-[11px] text-muted-foreground">Sem. {formatNumeric(w.weekStart).slice(0, 5)}</p>
                <p className="mt-1 text-lg font-semibold tabular">{w.completed}</p>
                <p className="text-[11px] text-muted-foreground">{w.minutes} min</p>
              </div>
            ))}
          </div>
          <Button asChild variant="link" className="mt-3"><Link href="/panel/progreso">Ver historial de sesiones completo</Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Información deportiva y preferencias</CardTitle><CardDescription>Se usan para personalizar tu panel y tus sugerencias.</CardDescription></CardHeader>
          <CardContent><ProfileForm profile={profile} prefs={prefs} /></CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between"><CardTitle>Objetivos personalizados</CardTitle>{!isPro && <Badge><Lock className="size-3" />Pro</Badge>}</div>
              <CardDescription>Define cuántas sesiones y minutos quieres completar cada semana.</CardDescription>
            </CardHeader>
            <CardContent>
              {isPro ? (
                <TargetsForm sessions={prefs.weekly_sessions_target} minutes={prefs.weekly_minutes_target} />
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Los objetivos personalizados forman parte del plan Pro.</p>
                  <Button asChild size="sm"><Link href="/panel/suscripcion">Ver Pro</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Récords personales</CardTitle><CardDescription>Marcas que introduces tú (por ejemplo, un test de 30 m o un salto).</CardDescription></CardHeader>
            <CardContent><RecordsManager records={records} today={today} /></CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Ajustes de cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Miembro desde</p>
              <p className="text-sm font-medium">{formatNumeric(profile.created_at.slice(0, 10))}</p>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium">Cambiar contraseña</h3>
            <div className="mt-3 max-w-sm"><ChangePasswordForm /></div>
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium">Tus datos</h3>
            <p className="mt-1 text-sm text-muted-foreground">Descarga todas tus sesiones, ejercicios, registros de recuperación y récords en formato CSV.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm"><a href="/api/export?tipo=sesiones" download><Download /> Entrenamientos (CSV)</a></Button>
              <Button asChild variant="secondary" size="sm"><a href="/api/export?tipo=recuperacion" download><Download /> Recuperación (CSV)</a></Button>
              <Button asChild variant="secondary" size="sm"><a href="/api/export?tipo=records" download><Download /> Récords (CSV)</a></Button>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border bg-background/40 p-4 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-primary" />
            <p>Solo guardamos tu email, un nombre o apodo, tu edad y los datos deportivos que introduces. Nadie más puede ver tus datos. Consulta la <Link href="/privacidad" className="underline">política de privacidad</Link>.</p>
          </div>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-destructive">Eliminar cuenta</h3>
            <p className="mt-1 text-sm text-muted-foreground">Borra tu cuenta y todos tus datos de forma permanente. Si tienes una suscripción Pro, se cancelará.</p>
            <div className="mt-3"><DeleteAccount /></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
