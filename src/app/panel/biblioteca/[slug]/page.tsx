import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowDown, ArrowUp, Clock, Dumbbell, Lock, Repeat, Timer, XCircle } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, EXERCISE_TYPES, GOALS, MUSCLE_GROUPS } from "@/lib/constants";
import type { CatalogEntry, Exercise } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ejercicio" };

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const { supabase } = await requireOnboardedAccount();
  // RLS solo devuelve el contenido si el ejercicio es gratuito o el usuario es Pro.
  const { data } = await supabase.from("exercise_library").select("*").eq("slug", slug).maybeSingle();
  const exercise = data as Exercise | null;

  if (!exercise) {
    const { data: catalog } = await supabase.rpc("exercise_catalog");
    const entry = ((catalog ?? []) as CatalogEntry[]).find((e) => e.slug === slug);
    if (!entry) notFound();
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button asChild variant="ghost" size="sm"><Link href="/panel/biblioteca"><ArrowLeft /> Biblioteca</Link></Button>
        <Card className="space-y-4 p-6 text-center sm:p-10">
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary"><Lock className="size-5" /></div>
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">{CATEGORIES[entry.category as keyof typeof CATEGORIES]}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{entry.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">Este ejercicio forma parte de la biblioteca completa del plan Pro.</p>
          <Button asChild><Link href="/panel/suscripcion">Ver plan Pro</Link></Button>
        </Card>
      </div>
    );
  }

  const facts = [
    { icon: Repeat, label: "Series y repeticiones", value: exercise.prescription },
    { icon: Timer, label: "Descanso orientativo", value: exercise.rest },
    { icon: Clock, label: "Duración aproximada", value: `${exercise.duration_min} min` },
    { icon: Dumbbell, label: "Material", value: exercise.equipment_detail ?? EQUIPMENT[exercise.equipment as keyof typeof EQUIPMENT] },
  ].filter((f) => f.value);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm"><Link href="/panel/biblioteca"><ArrowLeft /> Biblioteca</Link></Button>
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-primary">{CATEGORIES[exercise.category as keyof typeof CATEGORIES]}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{exercise.name}</h1>
        <p className="text-muted-foreground">{exercise.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="primary">Objetivo: {GOALS[exercise.goal as keyof typeof GOALS]}</Badge>
          <Badge>{MUSCLE_GROUPS[exercise.muscle_group as keyof typeof MUSCLE_GROUPS]}</Badge>
          <Badge>{EXERCISE_TYPES[exercise.exercise_type as keyof typeof EXERCISE_TYPES]}</Badge>
          <Badge>{DIFFICULTIES[exercise.difficulty as keyof typeof DIFFICULTIES]}</Badge>
          {exercise.is_pro && <Badge variant="primary">Pro</Badge>}
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-card p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Paso a paso</h2>
        <ol className="space-y-3">
          {exercise.instructions.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span>
              <p className="pt-0.5 text-sm leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {exercise.common_mistakes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Errores comunes</h2>
          <ul className="space-y-2">
            {exercise.common_mistakes.map((m) => (
              <li key={m} className="flex gap-2.5 text-sm text-muted-foreground"><XCircle className="mt-0.5 size-4 shrink-0 text-destructive/80" />{m}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {exercise.easier_variant && (
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ArrowDown className="size-3.5" />Variante más fácil</p>
            <p className="mt-2 text-sm">{exercise.easier_variant}</p>
          </Card>
        )}
        {exercise.harder_variant && (
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ArrowUp className="size-3.5" />Variante más difícil</p>
            <p className="mt-2 text-sm">{exercise.harder_variant}</p>
          </Card>
        )}
      </section>

      <section className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="size-4" />Seguridad</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-foreground/80">
          {exercise.safety_notes.map((n) => <li key={n}>· {n}</li>)}
          <li>· Detén el ejercicio si sientes dolor, mareo o molestias inusuales y consulta con un profesional.</li>
        </ul>
      </section>
    </article>
  );
}
