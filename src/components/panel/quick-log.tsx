"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { ScalePicker } from "@/components/forms/scale-picker";
import { CATEGORIES, RPE_LABELS, SESSION_TYPES, type SessionType } from "@/lib/constants";
import { matchProximityWarning } from "@/lib/planning";
import { cn } from "@/lib/utils";
import type { TrainingSession } from "@/lib/types";
import { createSession, updateSession } from "@/app/panel/actions";

export interface LibraryOption {
  id: string;
  name: string;
  category: string;
  prescription: string | null;
}

type OpenOptions = { mode?: "plan" | "log"; date?: string; session?: TrainingSession };

const Ctx = createContext<{ open: (o?: OpenOptions) => void }>({ open: () => {} });
export const useQuickLog = () => useContext(Ctx);

export function QuickLogProvider({ children, library, today, matchDay }: {
  children: React.ReactNode; library: LibraryOption[]; today: string; matchDay: number | null;
}) {
  const [state, setState] = useState<{ open: boolean; opts: OpenOptions; key: number }>({ open: false, opts: {}, key: 0 });
  const open = useCallback((opts: OpenOptions = { mode: "log" }) => setState((s) => ({ open: true, opts, key: s.key + 1 })), []);
  const value = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <SessionForm key={state.key} opts={state.opts} library={library} today={today} matchDay={matchDay}
            onDone={() => setState((s) => ({ ...s, open: false }))} />
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

function SessionForm({ opts, library, today, matchDay, onDone }: {
  opts: OpenOptions; library: LibraryOption[]; today: string; matchDay: number | null; onDone: () => void;
}) {
  const router = useRouter();
  const editing = opts.session;
  const [mode, setMode] = useState<"plan" | "log">(editing ? "plan" : (opts.mode ?? "log"));
  const [type, setType] = useState<SessionType>(editing?.session_type ?? "fuerza");
  const [title, setTitle] = useState(editing?.title ?? SESSION_TYPES.fuerza.label);
  const [titleTouched, setTitleTouched] = useState(!!editing);
  const [date, setDate] = useState(editing?.session_date ?? opts.date ?? today);
  const [planned, setPlanned] = useState(String(editing?.planned_minutes ?? SESSION_TYPES.fuerza.defaultMinutes));
  const [actual, setActual] = useState("");
  const [rpe, setRpe] = useState<number | null>(null);
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [exerciseIds, setExerciseIds] = useState<string[]>(
    (editing?.session_exercises ?? []).filter((e) => e.exercise_id).sort((a, b) => a.position - b.position).map((e) => e.exercise_id!),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const warning = matchProximityWarning(date, type, matchDay);
  const isFuture = date > today;

  function pickType(t: SessionType) {
    setType(t);
    if (!titleTouched) setTitle(SESSION_TYPES[t].label);
    if (!editing) setPlanned(String(SESSION_TYPES[t].defaultMinutes));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!title.trim()) fe.title = "Añade un título";
    if (mode === "log") {
      if (!actual || Number(actual) < 1 || Number(actual) > 400) fe.actual_minutes = "Indica entre 1 y 400 minutos";
      if (isFuture) fe.session_date = "No puedes registrar un entrenamiento en el futuro";
      if (distance && (Number(distance.replace(",", ".")) <= 0 || Number(distance.replace(",", ".")) > 100)) fe.distance_km = "Entre 0,1 y 100 km";
    }
    setErrors(fe);
    if (Object.keys(fe).length) return;

    const payload = {
      session_date: date,
      session_type: type,
      title,
      planned_minutes: planned || undefined,
      notes,
      exercise_ids: exerciseIds,
      mode,
      actual_minutes: mode === "log" ? Number(actual) : undefined,
      rpe: mode === "log" && rpe ? rpe : undefined,
      distance_km: mode === "log" && distance ? Number(distance.replace(",", ".")) : undefined,
    };
    startTransition(async () => {
      const res = editing ? await updateSession(editing.id, payload) : await createSession(payload);
      if (res.ok) {
        toast.success(res.message);
        onDone();
        router.refresh();
      } else {
        if ("fieldErrors" in res && res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar sesión" : mode === "log" ? "Registrar entrenamiento" : "Planificar sesión"}</DialogTitle>
        <DialogDescription>
          {editing ? "Cambia el día para reprogramarla." : mode === "log" ? "Anota una sesión que ya has hecho." : "Añade una sesión a tu planificación."}
        </DialogDescription>
      </DialogHeader>

      {!editing && (
        <div role="tablist" aria-label="Tipo de registro" className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-background/50 p-1">
          {(["log", "plan"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={cn("h-9 rounded-md text-sm transition", mode === m ? "bg-muted text-foreground" : "text-muted-foreground")}>
              {m === "log" ? "Ya lo he hecho" : "Planificar"}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Tipo de sesión</Label>
        <div role="radiogroup" aria-label="Tipo de sesión" className="flex flex-wrap gap-1.5">
          {(Object.keys(SESSION_TYPES) as SessionType[]).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => pickType(t)}
              className={cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition",
                type === t ? "border-foreground/60 bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>
              <span className="size-1.5 rounded-full" style={{ background: SESSION_TYPES[t].color }} />
              {SESSION_TYPES[t].short}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} aria-invalid={!!errors.title || undefined} />
          <FieldError>{errors.title}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" value={date} max={mode === "log" ? today : undefined} onChange={(e) => setDate(e.target.value)} aria-invalid={!!errors.session_date || undefined} />
          <FieldError>{errors.session_date}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="planned">Duración prevista</Label>
          <div className="relative">
            <Input id="planned" type="number" inputMode="numeric" min={5} max={300} value={planned} onChange={(e) => setPlanned(e.target.value)} className="pr-12" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
          </div>
          <FieldError>{errors.planned_minutes}</FieldError>
        </div>
      </div>

      {warning && (
        <div role="status" className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> <p>{warning}</p>
        </div>
      )}

      {mode === "log" && (
        <div className="space-y-4 rounded-xl border border-border bg-background/40 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="actual">Minutos reales</Label>
              <Input id="actual" type="number" inputMode="numeric" min={1} max={400} value={actual} onChange={(e) => setActual(e.target.value)} aria-invalid={!!errors.actual_minutes || undefined} />
              <FieldError>{errors.actual_minutes}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distance">Distancia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <div className="relative">
                <Input id="distance" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} className="pr-10" placeholder="—" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
              </div>
              <FieldError>{errors.distance_km}</FieldError>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Esfuerzo percibido (RPE) {rpe ? <span className="font-normal text-muted-foreground">· {RPE_LABELS[rpe]}</span> : null}</Label>
            <ScalePicker name="rpe" min={1} max={10} value={rpe} onChange={setRpe} label="Esfuerzo percibido" lowLabel="Muy suave" highLabel="Máximo" invert />
          </div>
        </div>
      )}

      <ExercisePicker library={library} value={exerciseIds} onChange={setExerciseIds} />

      <div className="space-y-2">
        <Label htmlFor="notes">Notas <span className="font-normal text-muted-foreground">(opcional)</span></Label>
        <Textarea id="notes" value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="Sensaciones, indicaciones del entrenador..." />
      </div>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {editing ? "Guardar cambios" : mode === "log" ? "Guardar entrenamiento" : "Añadir al plan"}
      </Button>
    </form>
  );
}

function ExercisePicker({ library, value, onChange }: { library: LibraryOption[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = value.map((id) => library.find((e) => e.id === id)).filter(Boolean) as LibraryOption[];
  const filtered = library.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Ejercicios <span className="font-normal text-muted-foreground">({value.length})</span></Label>
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-primary hover:underline">
          {open ? "Listo" : "Añadir ejercicios"}
        </button>
      </div>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((e) => (
            <li key={e.id} className="flex items-center gap-1 rounded-full border border-border bg-muted py-1 pl-3 pr-1 text-xs">
              {e.name}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== e.id))} className="rounded-full p-0.5 hover:bg-background" aria-label={`Quitar ${e.name}`}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!selected.length && !open && <FieldHint>Opcional. Elige ejercicios de la biblioteca.</FieldHint>}
      {open && (
        <div className="rounded-lg border border-border">
          <div className="relative border-b border-border">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio"
              className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {filtered.map((e) => {
              const on = value.includes(e.id);
              return (
                <li key={e.id}>
                  <button type="button" onClick={() => onChange(on ? value.filter((v) => v !== e.id) : [...value, e.id].slice(0, 12))}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted" aria-pressed={on}>
                    <span>
                      {e.name}
                      <span className="block text-xs text-muted-foreground">{CATEGORIES[e.category as keyof typeof CATEGORIES]}</span>
                    </span>
                    {on && <Check className="size-4 text-primary" />}
                  </button>
                </li>
              );
            })}
            {!filtered.length && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
