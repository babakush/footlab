import { z } from "zod";
import { isValidISODate } from "./dates";
import { EQUIPMENT, GOALS, LEVELS, POSITIONS, SESSION_TYPES, SESSION_STATUS } from "./constants";

const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const emailSchema = z.string().trim().toLowerCase().email("Introduce un email válido").max(254);
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga")
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/[0-9]/, "Incluye al menos un número");

export const isoDate = z.string().refine(isValidISODate, "Fecha no válida");
const weekday = z.coerce.number().int().min(1).max(7);

/** Convierte "" en undefined para campos opcionales de formularios. */
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : String(v).replace(",", ".")), z.coerce.number().pipe(schema).optional());

export const onboardingSchema = z
  .object({
    display_name: z.string().trim().min(1, "Indica cómo quieres que te llamemos").max(40, "Máximo 40 caracteres"),
    age: z.coerce.number({ message: "Indica tu edad" }).int("Edad no válida").min(14, "Debes tener al menos 14 años para usar FOOTLAB").max(70, "Edad no válida"),
    position: z.enum(keys(POSITIONS), { message: "Elige tu posición" }),
    level: z.enum(keys(LEVELS), { message: "Elige tu nivel" }),
    goal: z.enum(keys(GOALS), { message: "Elige tu objetivo principal" }),
    equipment: z.enum(keys(EQUIPMENT), { message: "Elige tu equipamiento" }),
    available_days: z.array(weekday).min(1, "Elige al menos un día disponible").max(7),
    team_days: z.array(weekday).max(7),
    match_day: z.preprocess((v) => (v === "" || v == null ? null : v), weekday.nullable()),
    guardian_acknowledged: z.boolean(),
    generate_plan: z.boolean(),
  })
  .refine((d) => d.age >= 18 || d.guardian_acknowledged, {
    path: ["guardian_acknowledged"],
    message: "Confirma que revisarás tus rutinas con tu entrenador o tutor",
  });

export const sessionSchema = z.object({
  session_date: isoDate,
  session_type: z.enum(keys(SESSION_TYPES), { message: "Elige un tipo de sesión" }),
  title: z.string().trim().min(1, "Añade un título").max(80, "Máximo 80 caracteres"),
  planned_minutes: optionalNumber(z.number().int().min(5, "Mínimo 5 min").max(300, "Máximo 300 min")),
  notes: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().transform((v) => v || null),
  exercise_ids: z.array(z.string().uuid()).max(12, "Máximo 12 ejercicios").default([]),
});

export const completeSessionSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(keys(SESSION_STATUS)),
  actual_minutes: optionalNumber(z.number().int().min(1, "Mínimo 1 min").max(400, "Máximo 400 min")),
  rpe: optionalNumber(z.number().int().min(1).max(10)),
  distance_km: optionalNumber(z.number().gt(0, "Debe ser mayor que 0").max(100, "Máximo 100 km")),
  notes: z.string().trim().max(1000).optional().transform((v) => v || null),
});

export const recoverySchema = z.object({
  log_date: isoDate,
  sleep_hours: optionalNumber(z.number().min(0).max(16, "Máximo 16 h")),
  sleep_quality: optionalNumber(z.number().int().min(1).max(5)),
  energy: optionalNumber(z.number().int().min(1).max(5)),
  muscle_fatigue: optionalNumber(z.number().int().min(1).max(5)),
  motivation: optionalNumber(z.number().int().min(1).max(5)),
  hydration_liters: optionalNumber(z.number().min(0).max(10, "Máximo 10 L")),
  significant_pain: z.boolean(),
  dizziness: z.boolean(),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional().transform((v) => v || null),
});

export const recordSchema = z.object({
  label: z.string().trim().min(1, "Indica qué récord es").max(60),
  value: z.preprocess((v) => String(v ?? "").replace(",", "."), z.coerce.number({ message: "Valor no válido" }).min(0, "Valor no válido").max(99999999)),
  unit: z.string().trim().min(1, "Indica la unidad").max(15),
  recorded_on: isoDate,
  notes: z.string().trim().max(300).optional().transform((v) => v || null),
});

export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Solo permite redirecciones internas (evita open redirects). */
export function safeNext(next: unknown, fallback = "/panel"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
