// Utilidades de fecha. Trabajamos con fechas de calendario "yyyy-MM-dd" en la
// zona horaria de España para que "hoy" sea el mismo día que ve el usuario.
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const TIME_ZONE = "Europe/Madrid";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Convierte "yyyy-MM-dd" a un Date a mediodía UTC (estable frente a zonas horarias). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseISODate(value);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Día ISO de la semana: 1 = lunes ... 7 = domingo */
export function isoWeekday(iso: string): number {
  const day = parseISODate(iso).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeekISO(iso: string): string {
  return addDaysISO(iso, 1 - isoWeekday(iso));
}

export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
}

export function diffDaysISO(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

function fmt(iso: string, pattern: string) {
  // Formateamos el Date construido a mediodía UTC con su componente local equivalente
  const d = parseISODate(iso);
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
  return format(local, pattern, { locale: es });
}

/** "lunes, 13 de octubre" */
export function formatLong(iso: string) {
  const s = fmt(iso, "EEEE, d 'de' MMMM");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "13 oct" */
export function formatShort(iso: string) {
  return fmt(iso, "d MMM");
}

/** "13/10/2026" */
export function formatNumeric(iso: string) {
  return fmt(iso, "dd/MM/yyyy");
}

/** "lun" */
export function formatWeekdayShort(iso: string) {
  return fmt(iso, "EEE");
}

export function formatWeekRange(weekStart: string) {
  const end = addDaysISO(weekStart, 6);
  const s = parseISODate(weekStart);
  const e = parseISODate(end);
  if (s.getUTCMonth() === e.getUTCMonth()) return `${fmt(weekStart, "d")}–${fmt(end, "d 'de' MMMM")}`;
  return `${fmt(weekStart, "d MMM")} – ${fmt(end, "d MMM")}`;
}

export function formatMinutes(total: number) {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatNumber(n: number, digits = 0) {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function relativeDayLabel(iso: string, today: string) {
  const diff = diffDaysISO(iso, today);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return `En ${diff} días`;
  return formatShort(iso);
}
