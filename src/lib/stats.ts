// Cálculos de estadísticas a partir de los datos introducidos por el usuario.
// No se infieren velocidades, distancias ni calorías.
import { addDaysISO, startOfWeekISO } from "./dates";
import type { RecoveryLog, TrainingSession } from "./types";
import type { SessionType } from "./constants";

export interface WeekSummary {
  weekStart: string;
  completed: number;
  planned: number;
  rested: number;
  minutes: number;
  /** Carga estimada (sRPE = minutos × esfuerzo percibido), solo sesiones con RPE */
  load: number;
  avgRpe: number | null;
  distanceKm: number;
}

export function summarizeWeek(sessions: TrainingSession[], weekStart: string): WeekSummary {
  const end = addDaysISO(weekStart, 7);
  const inWeek = sessions.filter((s) => s.session_date >= weekStart && s.session_date < end);
  const completed = inWeek.filter((s) => s.status === "completada");
  const withRpe = completed.filter((s) => s.rpe != null && s.actual_minutes != null);
  return {
    weekStart,
    completed: completed.length,
    planned: inWeek.length,
    rested: inWeek.filter((s) => s.status === "descansada").length,
    minutes: completed.reduce((a, s) => a + (s.actual_minutes ?? 0), 0),
    load: withRpe.reduce((a, s) => a + (s.actual_minutes ?? 0) * (s.rpe ?? 0), 0),
    avgRpe: withRpe.length ? withRpe.reduce((a, s) => a + (s.rpe ?? 0), 0) / withRpe.length : null,
    distanceKm: completed.reduce((a, s) => a + (s.distance_km ? Number(s.distance_km) : 0), 0),
  };
}

export function weeklySeries(sessions: TrainingSession[], today: string, weeks: number): WeekSummary[] {
  const current = startOfWeekISO(today);
  return Array.from({ length: weeks }, (_, i) => summarizeWeek(sessions, addDaysISO(current, -7 * (weeks - 1 - i))));
}

/**
 * Racha de constancia: semanas consecutivas con al menos `minPerWeek` sesiones
 * completadas. La semana en curso suma si ya se cumplió, pero no rompe la racha.
 */
export function weeklyStreak(sessions: TrainingSession[], today: string, minPerWeek: number): number {
  const current = startOfWeekISO(today);
  let streak = 0;
  if (summarizeWeek(sessions, current).completed >= minPerWeek) streak++;
  for (let i = 1; i < 104; i++) {
    const s = summarizeWeek(sessions, addDaysISO(current, -7 * i));
    if (s.completed >= minPerWeek) streak++;
    else break;
  }
  return streak;
}

export function byCategory(sessions: TrainingSession[]) {
  const counts = new Map<SessionType, { count: number; minutes: number }>();
  for (const s of sessions) {
    if (s.status !== "completada") continue;
    const c = counts.get(s.session_type) ?? { count: 0, minutes: 0 };
    c.count++;
    c.minutes += s.actual_minutes ?? 0;
    counts.set(s.session_type, c);
  }
  return [...counts.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.minutes - a.minutes);
}

/**
 * Indicador subjetivo de recuperación (0-100) a partir del último registro diario.
 * Es una estimación orientativa basada solo en las respuestas del usuario.
 */
export function recoveryScore(log: RecoveryLog | null | undefined): number | null {
  if (!log) return null;
  const parts: number[] = [];
  if (log.sleep_quality != null) parts.push((log.sleep_quality - 1) / 4);
  if (log.energy != null) parts.push((log.energy - 1) / 4);
  if (log.muscle_fatigue != null) parts.push((5 - log.muscle_fatigue) / 4);
  if (log.motivation != null) parts.push((log.motivation - 1) / 4);
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

export function recoveryLabel(score: number) {
  if (score >= 75) return { label: "Buena", tone: "primary" as const };
  if (score >= 50) return { label: "Aceptable", tone: "default" as const };
  if (score >= 30) return { label: "Baja", tone: "warning" as const };
  return { label: "Muy baja", tone: "destructive" as const };
}

export function hasWarningSymptoms(log: RecoveryLog | null | undefined) {
  return !!log && (log.significant_pain || log.dizziness);
}
