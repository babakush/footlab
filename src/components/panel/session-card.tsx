"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, Gauge, MoreHorizontal, Moon, Pencil, RotateCcw, Trash2 } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { FieldError, Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScalePicker } from "@/components/forms/scale-picker";
import { RPE_LABELS, SESSION_STATUS, SESSION_TYPES } from "@/lib/constants";
import { formatMinutes, formatNumber } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TrainingSession } from "@/lib/types";
import { deleteSession, setSessionStatus } from "@/app/panel/actions";
import { useQuickLog } from "./quick-log";

export function StatusBadge({ status }: { status: TrainingSession["status"] }) {
  const variant = status === "completada" ? "primary" : status === "descansada" ? "default" : "outline";
  return (
    <Badge variant={variant}>
      {status === "completada" && <Check className="size-3" />}
      {status === "descansada" && <Moon className="size-3" />}
      {SESSION_STATUS[status]}
    </Badge>
  );
}

export function SessionCard({ session, today, compact }: { session: TrainingSession; today: string; compact?: boolean }) {
  const router = useRouter();
  const { open } = useQuickLog();
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = SESSION_TYPES[session.session_type];
  const exercises = [...(session.session_exercises ?? [])].sort((a, b) => a.position - b.position);
  const canComplete = session.session_date <= today;

  function changeStatus(status: "pendiente" | "descansada") {
    startTransition(async () => {
      const res = await setSessionStatus({ id: session.id, status });
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    });
  }

  return (
    <article className={cn("group relative rounded-xl border bg-card p-4 transition-colors",
      session.status === "completada" ? "border-primary/25" : "border-border", session.status === "descansada" && "opacity-70")}>
      <span aria-hidden className="absolute inset-y-4 left-0 w-0.5 rounded-full" style={{ background: meta.color }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: meta.color }}>{meta.short}</p>
          <h4 className="truncate font-medium leading-snug">{session.title}</h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {session.status === "completada" && session.actual_minutes ? (
              <span className="flex items-center gap-1"><Clock className="size-3" />{formatMinutes(session.actual_minutes)}</span>
            ) : session.planned_minutes ? (
              <span className="flex items-center gap-1"><Clock className="size-3" />{formatMinutes(session.planned_minutes)} previstos</span>
            ) : null}
            {session.rpe ? <span className="flex items-center gap-1"><Gauge className="size-3" />RPE {session.rpe}</span> : null}
            {session.distance_km ? <span>{formatNumber(Number(session.distance_km), 2)} km</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <StatusBadge status={session.status} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Opciones de ${session.title}`}>
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-44 rounded-lg border border-border bg-elevated p-1 text-sm shadow-xl">
                <DropdownMenu.Item onSelect={() => open({ session })} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 outline-none data-[highlighted]:bg-muted">
                  <Pencil className="size-4" /> Editar o reprogramar
                </DropdownMenu.Item>
                {session.status !== "pendiente" && (
                  <DropdownMenu.Item onSelect={() => changeStatus("pendiente")} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 outline-none data-[highlighted]:bg-muted">
                    <RotateCcw className="size-4" /> Marcar como pendiente
                  </DropdownMenu.Item>
                )}
                {session.status !== "descansada" && (
                  <DropdownMenu.Item onSelect={() => changeStatus("descansada")} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 outline-none data-[highlighted]:bg-muted">
                    <Moon className="size-4" /> Marcar como descanso
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item onSelect={() => setDeleteOpen(true)} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-destructive outline-none data-[highlighted]:bg-destructive/10">
                  <Trash2 className="size-4" /> Eliminar
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {!compact && exercises.length > 0 && (
        <ol className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          {exercises.map((e, i) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span className="truncate"><span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>{e.name}</span>
              {e.prescription && <span className="shrink-0 text-xs text-muted-foreground">{e.prescription}</span>}
            </li>
          ))}
        </ol>
      )}
      {!compact && session.notes && <p className="mt-3 whitespace-pre-line border-t border-border pt-3 text-sm text-muted-foreground">{session.notes}</p>}

      {session.status === "pendiente" && session.session_type !== "partido" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => setCompleteOpen(true)} disabled={!canComplete || pending} title={canComplete ? undefined : "Podrás completarla el día de la sesión"}>
            <Check /> Completar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => changeStatus("descansada")} loading={pending}>Descansar</Button>
        </div>
      )}
      {session.status === "pendiente" && session.session_type === "partido" && canComplete && (
        <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => setCompleteOpen(true)}><Check /> Registrar minutos jugados</Button></div>
      )}

      <CompleteDialog session={session} open={completeOpen} onOpenChange={setCompleteOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar esta sesión?"
        description={<>Se eliminará «{session.title}» y sus ejercicios. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          const res = await deleteSession(session.id);
          if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
        }}
      />
    </article>
  );
}

function CompleteDialog({ session, open, onOpenChange }: { session: TrainingSession; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [minutes, setMinutes] = useState(String(session.planned_minutes ?? ""));
  const [rpe, setRpe] = useState<number | null>(null);
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState(session.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    const m = Number(minutes);
    if (!minutes || !Number.isInteger(m) || m < 1 || m > 400) fe.actual_minutes = "Indica entre 1 y 400 minutos";
    const dist = distance ? Number(distance.replace(",", ".")) : undefined;
    if (dist !== undefined && (Number.isNaN(dist) || dist <= 0 || dist > 100)) fe.distance_km = "Entre 0,1 y 100 km";
    setErrors(fe);
    if (Object.keys(fe).length) return;
    startTransition(async () => {
      const res = await setSessionStatus({ id: session.id, status: "completada", actual_minutes: m, rpe: rpe ?? undefined, distance_km: dist, notes });
      if (res.ok) { toast.success(res.message); onOpenChange(false); router.refresh(); }
      else { if ("fieldErrors" in res && res.fieldErrors) setErrors(res.fieldErrors); toast.error(res.error); }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>Completar sesión</DialogTitle>
            <DialogDescription>{session.title}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`min-${session.id}`}>Minutos reales</Label>
              <Input id={`min-${session.id}`} type="number" inputMode="numeric" min={1} max={400} value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-invalid={!!errors.actual_minutes || undefined} />
              <FieldError>{errors.actual_minutes}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`dist-${session.id}`}>Distancia <span className="font-normal text-muted-foreground">(opcional)</span></Label>
              <div className="relative">
                <Input id={`dist-${session.id}`} inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="—" className="pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">km</span>
              </div>
              <FieldError>{errors.distance_km}</FieldError>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Esfuerzo percibido (RPE) {rpe ? <span className="font-normal text-muted-foreground">· {RPE_LABELS[rpe]}</span> : null}</Label>
            <ScalePicker name="rpe" min={1} max={10} value={rpe} onChange={setRpe} label="Esfuerzo percibido" lowLabel="Muy suave" highLabel="Máximo" invert />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`notes-${session.id}`}>Notas</Label>
            <Textarea id={`notes-${session.id}`} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} placeholder="¿Cómo te has sentido?" />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={pending}>Guardar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
