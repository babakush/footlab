"use client";

import { Plus } from "lucide-react";
import { formatShort, isoWeekday, weekDaysISO } from "@/lib/dates";
import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TrainingSession } from "@/lib/types";
import { SessionCard } from "./session-card";
import { WeekCalendar } from "./week-calendar";
import { useQuickLog } from "./quick-log";

export function PlannerBoard({ weekStart, sessions, today, matchDay }: {
  weekStart: string; sessions: TrainingSession[]; today: string; matchDay: number | null;
}) {
  const { open } = useQuickLog();
  const days = weekDaysISO(weekStart);
  return (
    <>
      {/* Móvil y tablet: tira de días + lista */}
      <div className="lg:hidden">
        <WeekCalendar weekStart={weekStart} sessions={sessions} today={today} />
      </div>
      {/* Escritorio: tablero de 7 columnas */}
      <div className="hidden gap-2 lg:grid lg:grid-cols-7">
        {days.map((d) => {
          const list = sessions.filter((s) => s.session_date === d);
          const isToday = d === today;
          const isMatchDay = matchDay === isoWeekday(d);
          return (
            <section key={d} aria-label={WEEKDAYS[isoWeekday(d) - 1].label} className={cn("flex min-h-72 flex-col rounded-xl border bg-card/50 p-2", isToday ? "border-primary/50" : "border-border")}>
              <header className="mb-2 flex items-baseline justify-between px-1">
                <span className={cn("text-xs font-medium", isToday ? "text-primary" : "text-muted-foreground")}>{WEEKDAYS[isoWeekday(d) - 1].label}</span>
                <span className="text-xs text-muted-foreground tabular">{formatShort(d)}</span>
              </header>
              {isMatchDay && !list.some((s) => s.session_type === "partido") && (
                <p className="mb-2 rounded-md bg-destructive/10 px-2 py-1 text-[10px] text-destructive">Día habitual de partido</p>
              )}
              <div className="flex-1 space-y-2">
                {list.map((s) => <SessionCard key={s.id} session={s} today={today} compact />)}
              </div>
              <button onClick={() => open({ mode: d <= today ? "log" : "plan", date: d })}
                className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground transition hover:border-primary/50 hover:text-primary"
                aria-label={`Añadir sesión el ${WEEKDAYS[isoWeekday(d) - 1].label}`}>
                <Plus className="size-3.5" /> Añadir
              </button>
            </section>
          );
        })}
      </div>
    </>
  );
}
