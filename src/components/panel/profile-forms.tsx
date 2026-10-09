"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { DayPicker } from "@/components/forms/day-picker";
import { EQUIPMENT, GOALS, LEVELS, POSITIONS } from "@/lib/constants";
import { formatNumber, formatNumeric } from "@/lib/dates";
import type { PersonalRecord, PlayerPreferences, Profile } from "@/lib/types";
import { addRecord, deleteAccount, deleteRecord, updateProfile, updateTargets } from "@/app/panel/actions";
import { updatePassword } from "@/app/(auth)/actions";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> }>, onOk?: () => void) {
    start(async () => {
      const res = await fn();
      if (res.ok) { setErrors({}); toast.success(res.message); onOk?.(); router.refresh(); }
      else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
    });
  }
  return { pending, errors, run };
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </NativeSelect>
    </div>
  );
}

export function ProfileForm({ profile, prefs }: { profile: Profile; prefs: PlayerPreferences }) {
  const { pending, errors, run } = useAction();
  const [d, setD] = useState({
    display_name: profile.display_name, position: prefs.position as string, level: prefs.level as string, goal: prefs.goal as string,
    equipment: prefs.equipment as string, available_days: prefs.available_days, team_days: prefs.team_days, match_day: prefs.match_day,
  });
  return (
    <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => updateProfile(d)); }}>
      <div className="space-y-2">
        <Label htmlFor="pname">Nombre o apodo</Label>
        <Input id="pname" value={d.display_name} maxLength={40} onChange={(e) => setD({ ...d, display_name: e.target.value })} aria-invalid={!!errors.display_name || undefined} />
        <FieldError>{errors.display_name}</FieldError>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select id="pposition" label="Posición" value={d.position} onChange={(v) => setD({ ...d, position: v })} options={POSITIONS} />
        <Select id="plevel" label="Nivel" value={d.level} onChange={(v) => setD({ ...d, level: v })} options={LEVELS} />
        <Select id="pgoal" label="Objetivo" value={d.goal} onChange={(v) => setD({ ...d, goal: v })} options={GOALS} />
        <Select id="pequip" label="Equipamiento" value={d.equipment} onChange={(v) => setD({ ...d, equipment: v })} options={EQUIPMENT} />
      </div>
      <div className="space-y-2">
        <Label>Día de partido</Label>
        <DayPicker name="match_day" single label="Día de partido" value={d.match_day ? [d.match_day] : []}
          onChange={(v) => setD((p) => ({ ...p, match_day: v[0] ?? null, team_days: p.team_days.filter((t) => t !== v[0]), available_days: p.available_days.filter((t) => t !== v[0]) }))} />
      </div>
      <div className="space-y-2">
        <Label>Entrenamientos con el equipo</Label>
        <DayPicker name="team_days" label="Días con el equipo" value={d.team_days} disabledDays={d.match_day ? [d.match_day] : []}
          onChange={(v) => setD((p) => ({ ...p, team_days: v, available_days: p.available_days.filter((t) => !v.includes(t)) }))} />
      </div>
      <div className="space-y-2">
        <Label>Días disponibles por tu cuenta</Label>
        <DayPicker name="available_days" label="Días disponibles" value={d.available_days} disabledDays={[...d.team_days, ...(d.match_day ? [d.match_day] : [])]}
          onChange={(v) => setD({ ...d, available_days: v })} />
        <FieldError>{errors.available_days}</FieldError>
      </div>
      <Button type="submit" loading={pending}>Guardar cambios</Button>
    </form>
  );
}

export function TargetsForm({ sessions, minutes }: { sessions: number | null; minutes: number | null }) {
  const { pending, errors, run } = useAction();
  const [s, setS] = useState(sessions ? String(sessions) : "");
  const [m, setM] = useState(minutes ? String(minutes) : "");
  return (
    <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => updateTargets({ weekly_sessions_target: s, weekly_minutes_target: m })); }}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tsessions">Sesiones / semana</Label>
          <Input id="tsessions" type="number" inputMode="numeric" min={1} max={14} value={s} onChange={(e) => setS(e.target.value)} />
          <FieldError>{errors.weekly_sessions_target}</FieldError>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tminutes">Minutos / semana</Label>
          <Input id="tminutes" type="number" inputMode="numeric" min={30} max={1500} value={m} onChange={(e) => setM(e.target.value)} />
          <FieldError>{errors.weekly_minutes_target}</FieldError>
        </div>
      </div>
      <FieldHint>Déjalos vacíos para no usar objetivos. Progresa poco a poco y consúltalo con tu entrenador.</FieldHint>
      <Button type="submit" loading={pending}>Guardar objetivos</Button>
    </form>
  );
}

export function RecordsManager({ records, today }: { records: PersonalRecord[]; today: string }) {
  const { pending, errors, run } = useAction();
  const router = useRouter();
  const empty = { label: "", value: "", unit: "", recorded_on: today, notes: "" };
  const [d, setD] = useState(empty);
  return (
    <div className="space-y-4">
      {records.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{formatNumeric(r.recorded_on)}{r.notes ? ` · ${r.notes}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold tabular">{formatNumber(Number(r.value), 2)} {r.unit}</span>
                <ConfirmDialog
                  trigger={<button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label={`Eliminar ${r.label}`}><Trash2 className="size-4" /></button>}
                  title="¿Eliminar este récord?" description={`Se eliminará «${r.label}».`} confirmLabel="Eliminar"
                  onConfirm={async () => { const res = await deleteRecord(r.id); if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error); }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aún no has añadido récords.</p>
      )}
      <form className="grid grid-cols-6 gap-2" noValidate onSubmit={(e) => { e.preventDefault(); run(() => addRecord(d), () => setD(empty)); }}>
        <div className="col-span-6 space-y-1 sm:col-span-3">
          <Label htmlFor="rlabel" className="text-xs">Récord</Label>
          <Input id="rlabel" placeholder="Sprint 30 m" value={d.label} maxLength={60} onChange={(e) => setD({ ...d, label: e.target.value })} aria-invalid={!!errors.label || undefined} />
        </div>
        <div className="col-span-3 space-y-1 sm:col-span-2">
          <Label htmlFor="rvalue" className="text-xs">Valor</Label>
          <Input id="rvalue" inputMode="decimal" placeholder="4,35" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} aria-invalid={!!errors.value || undefined} />
        </div>
        <div className="col-span-3 space-y-1 sm:col-span-1">
          <Label htmlFor="runit" className="text-xs">Unidad</Label>
          <Input id="runit" placeholder="s" value={d.unit} maxLength={15} onChange={(e) => setD({ ...d, unit: e.target.value })} aria-invalid={!!errors.unit || undefined} />
        </div>
        <div className="col-span-6 space-y-1 sm:col-span-3">
          <Label htmlFor="rdate" className="text-xs">Fecha</Label>
          <Input id="rdate" type="date" max={today} value={d.recorded_on} onChange={(e) => setD({ ...d, recorded_on: e.target.value })} />
        </div>
        <div className="col-span-6 flex items-end sm:col-span-3">
          <Button type="submit" variant="secondary" className="w-full" loading={pending}>Añadir récord</Button>
        </div>
        <div className="col-span-6"><FieldError>{errors.label ?? errors.value ?? errors.unit ?? errors.recorded_on}</FieldError></div>
      </form>
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-3" noValidate>
      {state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      <div className="space-y-1.5">
        <Label htmlFor="newpass">Nueva contraseña</Label>
        <Input id="newpass" name="password" type="password" autoComplete="new-password" />
        <FieldError>{state?.fieldErrors?.password}</FieldError>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newpass2">Repite la contraseña</Label>
        <Input id="newpass2" name="confirm" type="password" autoComplete="new-password" />
        <FieldError>{state?.fieldErrors?.confirm}</FieldError>
      </div>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>Cambiar contraseña</Button>
    </form>
  );
}

export function DeleteAccount() {
  const [text, setText] = useState("");
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive" size="sm"><Trash2 /> Eliminar mi cuenta</Button>}
      title="¿Eliminar tu cuenta definitivamente?"
      description="Se borrarán tu perfil, sesiones, registros de recuperación y récords. Esta acción no se puede deshacer. Te recomendamos exportar tus datos antes."
      confirmLabel="Eliminar definitivamente"
      confirmDisabled={text.trim().toUpperCase() !== "ELIMINAR"}
      onConfirm={async () => {
        const res = await deleteAccount(text);
        if (res && !res.ok) toast.error(res.error);
      }}
    >
      <div className="mt-4 space-y-2">
        <Label htmlFor="confirm-delete">Escribe ELIMINAR para confirmar</Label>
        <Input id="confirm-delete" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
      </div>
    </ConfirmDialog>
  );
}
