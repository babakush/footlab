"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { ScalePicker } from "@/components/forms/scale-picker";
import { formatNumber, formatNumeric } from "@/lib/dates";
import type { RecoveryLog } from "@/lib/types";
import { deleteRecoveryLog, saveRecoveryLog } from "@/app/panel/actions";

export function RecoveryForm({ today, logs }: { today: string; logs: RecoveryLog[] }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const existing = logs.find((l) => l.log_date === date);
  return <RecoveryFields key={date + (existing?.id ?? "")} date={date} setDate={setDate} today={today} existing={existing} onSaved={() => router.refresh()} />;
}

function RecoveryFields({ date, setDate, today, existing, onSaved }: {
  date: string; setDate: (d: string) => void; today: string; existing?: RecoveryLog; onSaved: () => void;
}) {
  const [sleepHours, setSleepHours] = useState(existing?.sleep_hours != null ? String(existing.sleep_hours) : "");
  const [sleepQuality, setSleepQuality] = useState<number | null>(existing?.sleep_quality ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [fatigue, setFatigue] = useState<number | null>(existing?.muscle_fatigue ?? null);
  const [motivation, setMotivation] = useState<number | null>(existing?.motivation ?? null);
  const [hydration, setHydration] = useState(existing?.hydration_liters != null ? String(existing.hydration_liters) : "");
  const [pain, setPain] = useState(existing?.significant_pain ?? false);
  const [dizzy, setDizzy] = useState(existing?.dizziness ?? false);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveRecoveryLog({
        log_date: date, sleep_hours: sleepHours, sleep_quality: sleepQuality ?? "", energy: energy ?? "", muscle_fatigue: fatigue ?? "",
        motivation: motivation ?? "", hydration_liters: hydration, significant_pain: pain, dizziness: dizzy, notes,
      });
      if (res.ok) {
        setErrors({});
        toast.success(res.message, pain || dizzy ? { description: "Has indicado síntomas: te recomendamos no entrenar y consultar con un profesional sanitario." } : undefined);
        onSaved();
      } else {
        if ("fieldErrors" in res && res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
      }
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="log_date">Día</Label>
          <Input id="log_date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sleep_hours">Sueño (h)</Label>
          <Input id="sleep_hours" inputMode="decimal" placeholder="7,5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} aria-invalid={!!errors.sleep_hours || undefined} />
          <FieldError>{errors.sleep_hours}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hydration">Agua aprox. (L)</Label>
          <Input id="hydration" inputMode="decimal" placeholder="2" value={hydration} onChange={(e) => setHydration(e.target.value)} aria-invalid={!!errors.hydration_liters || undefined} />
          <FieldError>{errors.hydration_liters}</FieldError>
        </div>
      </div>
      <div className="space-y-2"><Label>Calidad del sueño</Label><ScalePicker name="sleep_quality" min={1} max={5} value={sleepQuality} onChange={setSleepQuality} label="Calidad del sueño" lowLabel="Muy mala" highLabel="Muy buena" /></div>
      <div className="space-y-2"><Label>Energía</Label><ScalePicker name="energy" min={1} max={5} value={energy} onChange={setEnergy} label="Energía" lowLabel="Sin energía" highLabel="Con mucha energía" /></div>
      <div className="space-y-2"><Label>Fatiga muscular</Label><ScalePicker name="muscle_fatigue" min={1} max={5} value={fatigue} onChange={setFatigue} label="Fatiga muscular" lowLabel="Nada cargado" highLabel="Muy cargado" invert /></div>
      <div className="space-y-2"><Label>Motivación</Label><ScalePicker name="motivation" min={1} max={5} value={motivation} onChange={setMotivation} label="Motivación" lowLabel="Baja" highLabel="Alta" /></div>

      <fieldset className="space-y-2 rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-muted-foreground">¿Has notado alguno de estos síntomas?</legend>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={pain} onChange={(e) => setPain(e.target.checked)} className="size-4 accent-[#c6f432]" />Dolor significativo</label>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={dizzy} onChange={(e) => setDizzy(e.target.checked)} className="size-4 accent-[#c6f432]" />Mareos</label>
        {(pain || dizzy) && (
          <p role="alert" className="flex gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertTriangle className="size-4 shrink-0" />No entrenes hoy y consulta con un profesional sanitario. Si es intenso o empeora, llama al 112.
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="rnotes">Notas</Label>
        <Textarea id="rnotes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>{existing ? "Actualizar registro" : "Guardar registro"}</Button>
    </form>
  );
}

export function RecoveryHistory({ logs }: { logs: RecoveryLog[] }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground">
          <th className="pb-2 font-normal">Día</th><th className="pb-2 font-normal">Sueño</th><th className="pb-2 font-normal">Calidad</th><th className="pb-2 font-normal">Energía</th><th className="pb-2 font-normal">Fatiga</th><th className="pb-2 font-normal">Motivación</th><th className="pb-2 font-normal">Agua</th><th className="pb-2" />
        </tr></thead>
        <tbody className="divide-y divide-border">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="py-2 tabular text-muted-foreground">{formatNumeric(l.log_date)}{(l.significant_pain || l.dizziness) && <AlertTriangle className="ml-1.5 inline size-3.5 text-destructive" aria-label="Síntomas indicados" />}</td>
              <td className="tabular">{l.sleep_hours != null ? `${formatNumber(Number(l.sleep_hours), 1)} h` : "—"}</td>
              <td className="tabular">{l.sleep_quality ?? "—"}</td>
              <td className="tabular">{l.energy ?? "—"}</td>
              <td className="tabular">{l.muscle_fatigue ?? "—"}</td>
              <td className="tabular">{l.motivation ?? "—"}</td>
              <td className="tabular">{l.hydration_liters != null ? `${formatNumber(Number(l.hydration_liters), 1)} L` : "—"}</td>
              <td className="text-right">
                <ConfirmDialog
                  trigger={<button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Eliminar registro del ${formatNumeric(l.log_date)}`}><Trash2 className="size-4" /></button>}
                  title="¿Eliminar este registro?"
                  description="Se borrará el registro de recuperación de ese día."
                  confirmLabel="Eliminar"
                  onConfirm={async () => {
                    const res = await deleteRecoveryLog(l.id);
                    if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
