"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { DayPicker } from "@/components/forms/day-picker";
import { EQUIPMENT, GOALS, LEVELS, POSITIONS, WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "./actions";

type Data = {
  display_name: string;
  age: string;
  position: string;
  level: string;
  goal: string;
  equipment: string;
  available_days: number[];
  team_days: number[];
  match_day: number | null;
  guardian_acknowledged: boolean;
  generate_plan: boolean;
};

const STEPS = ["Sobre ti", "Tu juego", "Tu objetivo", "Tu semana", "Listo"];

function OptionGrid<T extends Record<string, string>>({ options, value, onChange, label, cols = 2 }: {
  options: T; value: string; onChange: (v: string) => void; label: string; cols?: 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
      {Object.entries(options).map(([k, v]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={cn(
            "h-12 rounded-lg border px-3 text-left text-sm font-medium transition-all",
            value === k ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}>
          {v}
        </button>
      ))}
    </div>
  );
}

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [d, setD] = useState<Data>({
    display_name: defaultName, age: "", position: "", level: "", goal: "", equipment: "",
    available_days: [], team_days: [], match_day: null, guardian_acknowledged: false, generate_plan: true,
  });
  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((p) => ({ ...p, [k]: v }));
  const age = Number(d.age);
  const isMinor = d.age !== "" && age >= 14 && age < 18;

  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!d.display_name.trim()) e.display_name = "Indica cómo quieres que te llamemos";
      if (!d.age || !Number.isInteger(age)) e.age = "Indica tu edad";
      else if (age < 14) e.age = "FOOTLAB está disponible a partir de 14 años";
      else if (age > 70) e.age = "Edad no válida";
    }
    if (s === 1) {
      if (!d.position) e.position = "Elige tu posición";
      if (!d.level) e.level = "Elige tu nivel";
    }
    if (s === 2) {
      if (!d.goal) e.goal = "Elige tu objetivo principal";
      if (!d.equipment) e.equipment = "Elige tu equipamiento";
    }
    if (s === 3 && d.available_days.length === 0) e.available_days = "Elige al menos un día disponible";
    if (s === 4 && isMinor && !d.guardian_acknowledged) e.guardian_acknowledged = "Necesitamos esta confirmación para continuar";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function submit() {
    if (!validateStep(4)) return;
    setFormError(undefined);
    startTransition(async () => {
      const res = await completeOnboarding({ ...d, age: Number(d.age) });
      if (res?.fieldErrors) {
        setErrors(res.fieldErrors);
        const first = Object.keys(res.fieldErrors)[0];
        const stepOf: Record<string, number> = { display_name: 0, age: 0, position: 1, level: 1, goal: 2, equipment: 2, available_days: 3, team_days: 3, match_day: 3 };
        if (first in stepOf) setStep(stepOf[first]);
      }
      if (res?.error) setFormError(res.error);
    });
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Paso {step + 1} de {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} label="Progreso del cuestionario" />
      </div>

      <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1) next(); else submit(); }} className="space-y-6">
        {step === 0 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Vamos a conocerte</h1>
              <p className="mt-1 text-sm text-muted-foreground">Solo lo necesario para personalizar tu panel.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_name">¿Cómo quieres que te llamemos?</Label>
              <Input id="display_name" value={d.display_name} maxLength={40} autoComplete="nickname" onChange={(e) => set("display_name", e.target.value)} aria-invalid={!!errors.display_name || undefined} />
              {errors.display_name ? <FieldError>{errors.display_name}</FieldError> : <FieldHint>Un nombre o apodo. No necesitamos tu nombre completo.</FieldHint>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Edad</Label>
              <Input id="age" type="number" inputMode="numeric" min={14} max={70} value={d.age} onChange={(e) => set("age", e.target.value)} className="w-32" aria-invalid={!!errors.age || undefined} />
              {errors.age ? <FieldError>{errors.age}</FieldError> : <FieldHint>Solo guardamos tu edad, nunca tu fecha de nacimiento.</FieldHint>}
            </div>
            {isMinor && (
              <div className="flex gap-3 rounded-lg border border-info/30 bg-info/10 p-3 text-sm">
                <Info className="mt-0.5 size-4 shrink-0 text-info" />
                <p className="text-muted-foreground">Como eres menor de edad, no te pediremos ningún otro dato personal. Te recomendamos revisar tu planificación con tu entrenador, tutor o familia.</p>
              </div>
            )}
          </section>
        )}

        {step === 1 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Tu juego</h1>
            <div className="space-y-2">
              <Label>Posición habitual</Label>
              <OptionGrid options={POSITIONS} value={d.position} onChange={(v) => set("position", v)} label="Posición habitual" cols={3} />
              <FieldError>{errors.position}</FieldError>
            </div>
            <div className="space-y-2">
              <Label>Nivel</Label>
              <OptionGrid options={LEVELS} value={d.level} onChange={(v) => set("level", v)} label="Nivel" />
              <FieldError>{errors.level}</FieldError>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">¿Qué quieres mejorar?</h1>
            <div className="space-y-2">
              <Label>Objetivo principal</Label>
              <OptionGrid options={GOALS} value={d.goal} onChange={(v) => set("goal", v)} label="Objetivo principal" cols={3} />
              <FieldError>{errors.goal}</FieldError>
            </div>
            <div className="space-y-2">
              <Label>Equipamiento disponible</Label>
              <OptionGrid options={EQUIPMENT} value={d.equipment} onChange={(v) => set("equipment", v)} label="Equipamiento" cols={3} />
              <FieldError>{errors.equipment}</FieldError>
              <FieldHint>Material básico: conos, bandas elásticas, mancuernas ligeras o un balón.</FieldHint>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-6">
            <h1 className="text-2xl font-semibold tracking-tight">Tu semana tipo</h1>
            <div className="space-y-2">
              <Label>Día habitual de partido</Label>
              <DayPicker name="match_day" single label="Día de partido" value={d.match_day ? [d.match_day] : []}
                onChange={(v) => setD((p) => ({ ...p, match_day: v[0] ?? null, team_days: p.team_days.filter((t) => t !== v[0]), available_days: p.available_days.filter((t) => t !== v[0]) }))} />
              <FieldHint>Opcional. Pulsa de nuevo para quitarlo.</FieldHint>
            </div>
            <div className="space-y-2">
              <Label>Días de entrenamiento con tu equipo</Label>
              <DayPicker name="team_days" label="Días con el equipo" value={d.team_days} disabledDays={d.match_day ? [d.match_day] : []}
                onChange={(v) => setD((p) => ({ ...p, team_days: v, available_days: p.available_days.filter((t) => !v.includes(t)) }))} />
            </div>
            <div className="space-y-2">
              <Label>Días disponibles para entrenar por tu cuenta</Label>
              <DayPicker name="available_days" label="Días disponibles" value={d.available_days}
                disabledDays={[...d.team_days, ...(d.match_day ? [d.match_day] : [])]} onChange={(v) => set("available_days", v)} />
              {errors.available_days ? <FieldError>{errors.available_days}</FieldError> : <FieldHint>No hace falta que entrenes todos: dejaremos días de descanso.</FieldHint>}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Todo listo, {d.display_name.trim() || "crack"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Revisa tu resumen antes de empezar.</p>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border text-sm">
              {[
                ["Posición", POSITIONS[d.position as keyof typeof POSITIONS]],
                ["Nivel", LEVELS[d.level as keyof typeof LEVELS]],
                ["Objetivo", GOALS[d.goal as keyof typeof GOALS]],
                ["Material", EQUIPMENT[d.equipment as keyof typeof EQUIPMENT]],
                ["Partido", d.match_day ? WEEKDAYS[d.match_day - 1].label : "Sin día fijo"],
                ["Con el equipo", d.team_days.length ? d.team_days.map((x) => WEEKDAYS[x - 1].short).join(" · ") : "Ninguno"],
              ].map(([k, v]) => (
                <div key={k} className="bg-card p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
              ))}
            </dl>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm">
              <input type="checkbox" checked={d.generate_plan} onChange={(e) => set("generate_plan", e.target.checked)} className="mt-0.5 size-4 accent-[#c6f432]" />
              <span><span className="font-medium">Crear mi semana sugerida</span><span className="mt-0.5 block text-muted-foreground">Un plan prudente para esta semana y la próxima que podrás editar o borrar.</span></span>
            </label>

            {isMinor && (
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 p-4 text-sm">
                  <input type="checkbox" checked={d.guardian_acknowledged} onChange={(e) => set("guardian_acknowledged", e.target.checked)} className="mt-0.5 size-4 accent-[#c6f432]" />
                  <span>Revisaré mis rutinas con mi entrenador, tutor o familia y las adaptaré a sus indicaciones.</span>
                </label>
                <FieldError>{errors.guardian_acknowledged}</FieldError>
              </div>
            )}

            <div className="flex gap-3 rounded-lg border border-border bg-card/60 p-4 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <p>Las rutinas son orientativas y no sustituyen a tu entrenador ni a un profesional sanitario. Si sientes dolor, mareos u otros síntomas, detén el entrenamiento y consulta con un profesional.</p>
            </div>
          </section>
        )}

        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{formError}</p>}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ArrowLeft /> Atrás
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={pending}>
            {step < STEPS.length - 1 ? <>Continuar <ArrowRight /></> : "Empezar a entrenar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
