"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SESSION_TYPES } from "@/lib/constants";
import { formatLong, weekDaysISO, isoWeekday } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TrainingSession } from "@/lib/types";
import { SessionCard } from "./session-card";
import { useQuickLog } from "./quick-log";
import { WEEKDAYS } from "@/lib/constants";

/** Calendario semanal interactivo (lunes a domingo). */
export function WeekCalendar({ weekStart, sessions, today, initialDay }: {
  weekStart: string; sessions: TrainingSession[]; today: string; initialDay?: string;
}) {
  const days = weekDaysISO(weekStart);
  const [selected, setSelected] = useState(initialDay && days.includes(initialDay) ? initialDay : days.includes(today) ? today : days[0]);
  const { open } = useQuickLog();
  const daySessions = sessions.filter((s) => s.session_date === selected);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Días de la semana" className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const list = sessions.filter((s) => s.session_date === d);
          const isSel = d === selected;
          const isToday = d === today;
          const allDone = list.length > 0 && list.every((s) => s.status !== "pendiente");
          return (
            <button key={d} role="tab" aria-selected={isSel} aria-label={`${formatLong(d)}: ${list.length} sesiones`} onClick={() => setSelected(d)}
              className={cn(
                "flex min-h-[86px] flex-col items-center rounded-xl border px-1 pb-2 pt-2 transition-all",
                isSel ? "border-primary/70 bg-primary/[0.07]" : "border-border bg-card hover:border-foreground/20",
              )}>
              <span className={cn("text-[11px] font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{WEEKDAYS[isoWeekday(d) - 1].short}</span>
              <span className={cn("mt-0.5 grid size-7 place-items-center rounded-full text-sm font-semibold tabular", isToday && "bg-primary text-primary-foreground")}>
                {Number(d.slice(8))}
              </span>
              <span className="mt-auto flex flex-wrap justify-center gap-0.5 pt-1.5">
                {list.length === 0 && <span className="text-[10px] text-muted-foreground/60">—</span>}
                {list.slice(0, 3).map((s) => (
                  <span key={s.id} className={cn("h-1.5 w-3 rounded-full", s.status === "pendiente" && "opacity-40")} style={{ background: SESSION_TYPES[s.session_type].color }} />
                ))}
              </span>
              {allDone && <span className="sr-only">Completado</span>}
            </button>
          );
        })}
      </div>

      <div className="space-y-2" role="tabpanel">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{formatLong(selected)}</p>
          <Button size="sm" variant="ghost" onClick={() => open({ mode: selected <= today ? "log" : "plan", date: selected })}>
            <Plus /> Añadir
          </Button>
        </div>
        {daySessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Día libre. Descansar también es entrenar.
          </div>
        ) : (
          <div className="space-y-2">{daySessions.map((s) => <SessionCard key={s.id} session={s} today={today} />)}</div>
        )}
      </div>
    </div>
  );
}
