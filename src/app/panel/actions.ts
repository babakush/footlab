"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { friendlyDbError, getAccount } from "@/lib/data";
import {
  completeSessionSchema, firstErrors, isoDate, recordSchema, recoverySchema, sessionSchema,
} from "@/lib/validation";
import { addDaysISO, startOfWeekISO, todayISO } from "@/lib/dates";
import { suggestWeek, type LibraryLite } from "@/lib/planning";
import { insertSuggestedSessions } from "@/lib/sessions";
import { EQUIPMENT, GOALS, LEVELS, POSITIONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

type FieldResult = ActionResult & { fieldErrors?: Record<string, string> };

function done(message?: string): ActionResult {
  revalidatePath("/panel", "layout");
  return { ok: true, message };
}

// ───────────────────────── Sesiones ─────────────────────────

const createInput = sessionSchema.extend({
  mode: z.enum(["plan", "log"]).default("plan"),
  actual_minutes: z.coerce.number().int().min(1).max(400).optional(),
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  distance_km: z.coerce.number().gt(0).max(100).optional(),
});

export async function createSession(input: unknown): Promise<FieldResult> {
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const d = parsed.data;
  if (d.mode === "log" && !d.actual_minutes) {
    return { ok: false, error: "Indica cuántos minutos has entrenado.", fieldErrors: { actual_minutes: "Obligatorio" } };
  }
  const { supabase } = await getAccount();
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({
      session_date: d.session_date,
      session_type: d.session_type,
      title: d.title,
      planned_minutes: d.planned_minutes ?? null,
      notes: d.notes,
      ...(d.mode === "log"
        ? {
            status: "completada",
            actual_minutes: d.actual_minutes,
            rpe: d.rpe ?? null,
            distance_km: d.distance_km ?? null,
            completed_at: new Date().toISOString(),
          }
        : {}),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  const exError = await replaceExercises(supabase, data.id, d.exercise_ids);
  if (exError) return { ok: false, error: exError };
  return done(d.mode === "log" ? "Entrenamiento registrado" : "Sesión añadida");
}

export async function updateSession(id: string, input: unknown): Promise<FieldResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Sesión no válida." };
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const d = parsed.data;
  const { supabase } = await getAccount();
  const { data, error } = await supabase
    .from("training_sessions")
    .update({
      session_date: d.session_date,
      session_type: d.session_type,
      title: d.title,
      planned_minutes: d.planned_minutes ?? null,
      notes: d.notes,
    })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!data?.length) return { ok: false, error: "No se ha encontrado la sesión." };
  const exError = await replaceExercises(supabase, id, d.exercise_ids);
  if (exError) return { ok: false, error: exError };
  return done("Sesión actualizada");
}

async function replaceExercises(supabase: Awaited<ReturnType<typeof getAccount>>["supabase"], sessionId: string, exerciseIds: string[]) {
  const { error: delError } = await supabase.from("session_exercises").delete().eq("session_id", sessionId);
  if (delError) return friendlyDbError(delError.message);
  if (!exerciseIds.length) return null;
  // Solo se pueden añadir ejercicios visibles para el usuario (RLS filtra los Pro).
  const { data: lib } = await supabase.from("exercise_library").select("id, name, prescription").in("id", exerciseIds);
  const byId = new Map((lib ?? []).map((e) => [e.id, e]));
  const rows = exerciseIds
    .filter((x) => byId.has(x))
    .map((x, i) => ({
      session_id: sessionId,
      exercise_id: x,
      name: byId.get(x)!.name,
      prescription: byId.get(x)!.prescription?.slice(0, 60) ?? null,
      position: i,
    }));
  if (!rows.length) return null;
  const { error } = await supabase.from("session_exercises").insert(rows);
  return error ? friendlyDbError(error.message) : null;
}

export async function moveSession(id: string, date: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success || !isoDate.safeParse(date).success) {
    return { ok: false, error: "Datos no válidos." };
  }
  const { supabase } = await getAccount();
  const { data, error } = await supabase.from("training_sessions").update({ session_date: date }).eq("id", id).select("id");
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!data?.length) return { ok: false, error: "No se ha encontrado la sesión." };
  return done("Sesión reprogramada");
}

export async function setSessionStatus(input: unknown): Promise<FieldResult> {
  const parsed = completeSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const d = parsed.data;
  if (d.status === "completada" && !d.actual_minutes) {
    return { ok: false, error: "Indica la duración real de la sesión.", fieldErrors: { actual_minutes: "Obligatorio" } };
  }
  const { supabase } = await getAccount();
  const patch =
    d.status === "completada"
      ? { status: d.status, actual_minutes: d.actual_minutes, rpe: d.rpe ?? null, distance_km: d.distance_km ?? null, notes: d.notes, completed_at: new Date().toISOString() }
      : { status: d.status, actual_minutes: null, rpe: null, distance_km: null, completed_at: null, ...(d.notes ? { notes: d.notes } : {}) };
  const { data, error } = await supabase.from("training_sessions").update(patch).eq("id", d.id).select("id");
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!data?.length) return { ok: false, error: "No se ha encontrado la sesión." };
  const messages = { completada: "¡Sesión completada!", descansada: "Marcada como día de descanso", pendiente: "Sesión marcada como pendiente" };
  return done(messages[d.status]);
}

export async function deleteSession(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Sesión no válida." };
  const { supabase } = await getAccount();
  const { data, error } = await supabase.from("training_sessions").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!data?.length) return { ok: false, error: "No se ha encontrado la sesión." };
  return done("Sesión eliminada");
}

// ───────────────────────── Herramientas Pro de planificación ─────────────────────────

export async function copyPreviousWeek(weekStart: string): Promise<ActionResult> {
  if (!isoDate.safeParse(weekStart).success) return { ok: false, error: "Semana no válida." };
  const { supabase, isPro } = await getAccount();
  if (!isPro) return { ok: false, error: "Copiar semanas es una función del plan Pro." };
  const start = startOfWeekISO(weekStart);
  const prevStart = addDaysISO(start, -7);
  const { data: prev, error } = await supabase
    .from("training_sessions")
    .select("session_date, session_type, title, planned_minutes, session_exercises(exercise_id, name, prescription, position)")
    .gte("session_date", prevStart)
    .lt("session_date", start);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (!prev?.length) return { ok: false, error: "La semana anterior no tiene sesiones para copiar." };
  const res = await insertSuggestedSessions(
    supabase,
    prev.map((s) => ({
      session_date: addDaysISO(s.session_date, 7),
      session_type: s.session_type,
      title: s.title,
      planned_minutes: s.planned_minutes ?? 30,
      exercises: (s.session_exercises ?? [])
        .sort((a, b) => a.position - b.position)
        .filter((e) => e.exercise_id)
        .map((e) => ({ exercise_id: e.exercise_id!, name: e.name, prescription: e.prescription })),
    })),
  );
  if (res.error) return { ok: false, error: res.error };
  return done(`${res.inserted} sesiones copiadas`);
}

export async function generateWeek(weekStart: string): Promise<ActionResult> {
  if (!isoDate.safeParse(weekStart).success) return { ok: false, error: "Semana no válida." };
  const { supabase, isPro, prefs, profile } = await getAccount();
  if (!isPro) return { ok: false, error: "Generar semanas sugeridas es una función del plan Pro." };
  if (!prefs) return { ok: false, error: "Completa tu perfil primero." };
  const start = startOfWeekISO(weekStart);
  const { count } = await supabase
    .from("training_sessions")
    .select("id", { count: "exact", head: true })
    .gte("session_date", start)
    .lt("session_date", addDaysISO(start, 7));
  if (count) return { ok: false, error: "Esta semana ya tiene sesiones. Vacíala o edítala manualmente." };
  const { data: library } = await supabase
    .from("exercise_library")
    .select("id, slug, name, category, equipment, difficulty, prescription, is_pro");
  const today = todayISO();
  const sessions = suggestWeek(prefs, start, (library ?? []) as LibraryLite[], {
    age: profile?.age ?? null,
    isPro,
    fromDate: today,
  });
  if (!sessions.length) return { ok: false, error: "No quedan días disponibles en esta semana." };
  const res = await insertSuggestedSessions(supabase, sessions);
  if (res.error) return { ok: false, error: res.error };
  return done(`Semana sugerida creada (${res.inserted} sesiones)`);
}

// ───────────────────────── Recuperación ─────────────────────────

export async function saveRecoveryLog(input: unknown): Promise<FieldResult> {
  const parsed = recoverySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  if (parsed.data.log_date > todayISO()) return { ok: false, error: "No puedes registrar días futuros." };
  const { supabase, user } = await getAccount();
  const { error } = await supabase
    .from("daily_recovery_logs")
    .upsert({ ...parsed.data, user_id: user.id }, { onConflict: "user_id,log_date" });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Registro guardado");
}

export async function deleteRecoveryLog(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Registro no válido." };
  const { supabase } = await getAccount();
  const { error } = await supabase.from("daily_recovery_logs").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Registro eliminado");
}

// ───────────────────────── Récords ─────────────────────────

export async function addRecord(input: unknown): Promise<FieldResult> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const { supabase } = await getAccount();
  const { error } = await supabase.from("personal_records").insert(parsed.data);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Récord guardado");
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Récord no válido." };
  const { supabase } = await getAccount();
  const { error } = await supabase.from("personal_records").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Récord eliminado");
}

// ───────────────────────── Perfil y preferencias ─────────────────────────

const weekday = z.coerce.number().int().min(1).max(7);
const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const profileInput = z.object({
  display_name: z.string().trim().min(1, "Obligatorio").max(40),
  position: z.enum(keys(POSITIONS)),
  level: z.enum(keys(LEVELS)),
  goal: z.enum(keys(GOALS)),
  equipment: z.enum(keys(EQUIPMENT)),
  available_days: z.array(weekday).min(1, "Elige al menos un día"),
  team_days: z.array(weekday),
  match_day: weekday.nullable(),
});

export async function updateProfile(input: unknown): Promise<FieldResult> {
  const parsed = profileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const d = parsed.data;
  const { supabase, user } = await getAccount();
  const { error: pErr } = await supabase.from("profiles").update({ display_name: d.display_name }).eq("id", user.id);
  if (pErr) return { ok: false, error: friendlyDbError(pErr.message) };
  const { error } = await supabase
    .from("player_preferences")
    .update({
      position: d.position,
      level: d.level,
      goal: d.goal,
      equipment: d.equipment,
      available_days: d.available_days.filter((x) => x !== d.match_day && !d.team_days.includes(x)),
      team_days: d.team_days.filter((x) => x !== d.match_day),
      match_day: d.match_day,
    })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Perfil actualizado");
}

const targetsInput = z.object({
  weekly_sessions_target: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1, "Mínimo 1").max(14, "Máximo 14").nullable()),
  weekly_minutes_target: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(30, "Mínimo 30").max(1500, "Máximo 1500").nullable()),
});

export async function updateTargets(input: unknown): Promise<FieldResult> {
  const parsed = targetsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: firstErrors(parsed.error) };
  const { supabase, user, isPro } = await getAccount();
  if (!isPro) return { ok: false, error: "Los objetivos personalizados forman parte del plan Pro." };
  // La base de datos vuelve a comprobar el plan (trigger enforce_pro_targets).
  const { error } = await supabase.from("player_preferences").update(parsed.data).eq("user_id", user.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return done("Objetivos guardados");
}

// ───────────────────────── Cuenta ─────────────────────────

export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  if (confirmation.trim().toUpperCase() !== "ELIMINAR") return { ok: false, error: "Escribe ELIMINAR para confirmar." };
  const { supabase, subscription } = await getAccount();

  // Si hay una suscripción activa en Stripe, se cancela antes de borrar los datos.
  const activeStatuses = ["active", "trialing", "past_due", "unpaid", "incomplete", "paused"];
  if (subscription && activeStatuses.includes(subscription.status)) {
    if (!isStripeConfigured()) {
      return { ok: false, error: "No se puede cancelar tu suscripción porque los pagos no están configurados. Contacta con soporte." };
    }
    const { data: sub } = await supabase.from("subscriptions").select("stripe_subscription_id").maybeSingle();
    if (sub?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
      } catch {
        return { ok: false, error: "No hemos podido cancelar tu suscripción en Stripe. Inténtalo de nuevo." };
      }
    }
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { ok: false, error: "No se ha podido eliminar la cuenta. Inténtalo de nuevo." };
  await supabase.auth.signOut();
  redirect("/?cuenta=eliminada");
}
