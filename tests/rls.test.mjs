// Pruebas de seguridad de la base de datos (RLS) contra una instancia de Supabase.
// Uso: SUPABASE_URL=... ANON_KEY=... SERVICE_KEY=... node tests/rls.test.mjs
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.SUPABASE_URL, anon = process.env.ANON_KEY, service = process.env.SERVICE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
let passed = 0;
const ok = (name) => { passed++; console.log("  ✓", name); };

async function makeUser(tag) {
  const email = `rls-${tag}-${stamp}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: "Passw0rd!x", email_confirm: true });
  if (error) throw error;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password: "Passw0rd!x" });
  if (e2) throw e2;
  return { id: data.user.id, client };
}

const A = await makeUser("a");
const B = await makeUser("b");
const anonClient = createClient(url, anon, { auth: { persistSession: false } });

// Perfil creado automáticamente
const { data: profA } = await A.client.from("profiles").select("*");
assert.equal(profA.length, 1); assert.equal(profA[0].id, A.id); ok("el trigger crea el perfil y solo se ve el propio");

await A.client.from("player_preferences").insert({ user_id: A.id, position: "extremo", level: "amateur", goal: "velocidad", equipment: "sin_material", available_days: [1, 3] });
const { data: sA, error: eIns } = await A.client.from("training_sessions").insert({ session_date: "2026-10-12", session_type: "fuerza", title: "Sesión A" }).select().single();
assert.ifError(eIns); ok("A puede crear sus sesiones");

// B no ve datos de A
const { data: bSees } = await B.client.from("training_sessions").select("*");
assert.equal(bSees.length, 0); ok("B no puede leer sesiones de A");
const { data: bProf } = await B.client.from("profiles").select("*").eq("id", A.id);
assert.equal(bProf.length, 0); ok("B no puede leer el perfil de A");
const { data: bPrefs } = await B.client.from("player_preferences").select("*");
assert.equal(bPrefs.length, 0); ok("B no puede leer preferencias de A");

// B no puede modificar ni borrar datos de A
const { data: upd } = await B.client.from("training_sessions").update({ title: "hack" }).eq("id", sA.id).select();
assert.equal(upd.length, 0);
const { data: del } = await B.client.from("training_sessions").delete().eq("id", sA.id).select();
assert.equal(del.length, 0);
const { data: still } = await A.client.from("training_sessions").select("title").eq("id", sA.id).single();
assert.equal(still.title, "Sesión A"); ok("B no puede modificar ni borrar sesiones de A");

// B no puede insertar a nombre de A
const { error: eForge } = await B.client.from("training_sessions").insert({ user_id: A.id, session_date: "2026-10-12", session_type: "fuerza", title: "x" });
assert.ok(eForge); ok("B no puede crear sesiones con el user_id de A");

// B no puede añadir ejercicios a la sesión de A
const { error: eEx } = await B.client.from("session_exercises").insert({ session_id: sA.id, name: "x" });
assert.ok(eEx); ok("B no puede añadir ejercicios a una sesión de A");

// Anónimo
const { data: anonSessions, error: anonErr } = await anonClient.from("training_sessions").select("*");
assert.ok(anonErr || anonSessions.length === 0); ok("un visitante anónimo no lee datos privados");
const { data: anonLib } = await anonClient.from("exercise_library").select("slug, is_pro");
assert.ok(anonLib.length > 0 && anonLib.every((e) => !e.is_pro)); ok("anónimo lee solo ejercicios gratuitos");

// Pro: biblioteca y objetivos
const { data: freeLib } = await A.client.from("exercise_library").select("is_pro");
assert.ok(freeLib.every((e) => !e.is_pro)); ok("usuario gratuito no recibe el contenido de ejercicios Pro");
const { data: cat } = await A.client.rpc("exercise_catalog");
assert.ok(cat.some((e) => e.is_pro && e.summary === null)); ok("el catálogo muestra Pro bloqueados sin contenido");
const { error: eTarget } = await A.client.from("player_preferences").update({ weekly_sessions_target: 4 }).eq("user_id", A.id);
assert.ok(eTarget && eTarget.message.includes("PRO_REQUIRED")); ok("objetivos personalizados bloqueados en BD sin Pro");

// Suscripciones: el cliente no puede auto-asignarse Pro
const { error: eSub } = await A.client.from("subscriptions").insert({ user_id: A.id, status: "active" });
assert.ok(eSub); ok("el usuario no puede crear su propia suscripción");
const { error: eHas } = await A.client.rpc("has_pro", { uid: B.id });
assert.ok(eHas); ok("has_pro(uid) no es invocable por clientes");
const { data: isPro } = await A.client.rpc("current_user_is_pro");
assert.equal(isPro, false); ok("current_user_is_pro = false sin suscripción");

// Límite semanal del plan gratuito (5 sesiones personales)
for (let i = 0; i < 4; i++) await A.client.from("training_sessions").insert({ session_date: "2026-10-13", session_type: "tecnica", title: `T${i}` });
const { error: eLimit } = await A.client.from("training_sessions").insert({ session_date: "2026-10-14", session_type: "velocidad", title: "6ª" });
assert.ok(eLimit && eLimit.message.includes("FREE_PLAN_WEEKLY_LIMIT")); ok("límite de 5 sesiones personales/semana en el plan gratuito");
const { error: eTeam } = await A.client.from("training_sessions").insert({ session_date: "2026-10-14", session_type: "equipo", title: "Equipo" });
assert.ifError(eTeam); ok("los entrenamientos de equipo no cuentan para el límite");

// Activar Pro desde el servidor (service role, como hace el webhook)
await admin.from("subscriptions").upsert({ user_id: A.id, status: "active", current_period_end: new Date(Date.now() + 864e5 * 30).toISOString() });
const { data: proNow } = await A.client.rpc("current_user_is_pro");
assert.equal(proNow, true);
const { data: proLib } = await A.client.from("exercise_library").select("is_pro");
assert.ok(proLib.some((e) => e.is_pro)); ok("con suscripción activa se desbloquea la biblioteca completa");
const { error: eLimitPro } = await A.client.from("training_sessions").insert({ session_date: "2026-10-14", session_type: "velocidad", title: "6ª Pro" });
assert.ifError(eLimitPro); ok("Pro no tiene límite semanal");
const { error: eTargetPro } = await A.client.from("player_preferences").update({ weekly_sessions_target: 4 }).eq("user_id", A.id);
assert.ifError(eTargetPro); ok("Pro puede fijar objetivos personalizados");
const { data: bSub } = await B.client.from("subscriptions").select("*");
assert.equal(bSub.length, 0); ok("B no ve la suscripción de A");

// Suscripción caducada => sin Pro
await admin.from("subscriptions").update({ current_period_end: new Date(Date.now() - 1000).toISOString() }).eq("user_id", A.id);
const { data: expired } = await A.client.rpc("current_user_is_pro");
assert.equal(expired, false); ok("una suscripción caducada no da acceso Pro");

// Borrado de cuenta
const { error: eDelB } = await B.client.rpc("delete_my_account");
assert.ifError(eDelB);
const { data: gone } = await admin.from("profiles").select("id").eq("id", B.id);
assert.equal(gone.length, 0); ok("delete_my_account borra al usuario y sus datos en cascada");
const { error: eAnonDel } = await anonClient.rpc("delete_my_account");
assert.ok(eAnonDel); ok("anónimo no puede invocar delete_my_account");

await admin.auth.admin.deleteUser(A.id);
console.log(`\n${passed} comprobaciones de seguridad superadas`);
