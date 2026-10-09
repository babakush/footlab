// Comprueba en el navegador que Pro se desbloquea solo con una suscripción activa en BD
// y que el checkout muestra un error claro si Stripe rechaza la petición.
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const admin = createClient(process.env.SUPABASE_URL, process.env.SERVICE_KEY, { auth: { persistSession: false } });
let n = 0; const ok = (m) => console.log(`  ✓ ${++n}. ${m}`);

async function makeUser(pro) {
  const email = `ui${pro ? "pro" : "free"}${Date.now()}@example.com`;
  const { data } = await admin.auth.admin.createUser({ email, password: "Futbol2026", email_confirm: true });
  const id = data.user.id;
  await admin.from("profiles").update({ display_name: pro ? "Pro" : "Free", age: 22, onboarding_completed: true }).eq("id", id);
  await admin.from("player_preferences").insert({ user_id: id, position: "central", level: "semiprofesional", goal: "fuerza", equipment: "gimnasio", available_days: [1, 3, 5], team_days: [2, 4], match_day: 7 });
  if (pro) await admin.from("subscriptions").insert({ user_id: id, status: "active", stripe_customer_id: "cus_ui_" + Date.now(), current_period_end: new Date(Date.now() + 30 * 864e5).toISOString() });
  return { id, email };
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
async function login(email) {
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
  await page.goto(BASE + "/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("Futbol2026");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/panel/);
  return page;
}
const users = [];
try {
  const pro = await makeUser(true); users.push(pro.id);
  const p = await login(pro.email);
  await p.goto(BASE + "/panel/biblioteca/pallof-press");
  await p.getByText("Paso a paso").waitFor(); ok("Pro ve el contenido de ejercicios Pro");
  await p.goto(BASE + "/panel/progreso?semanas=26");
  await p.getByRole("link", { name: "26 sem" }).waitFor(); ok("Pro accede a rangos ampliados de historial");
  await p.goto(BASE + "/panel/plan");
  await p.getByRole("button", { name: /Copiar semana anterior/ }).waitFor(); ok("Pro ve las herramientas avanzadas de planificación");
  const iso = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);
  await p.goto(BASE + `/panel/plan?semana=${iso(new Date(Date.now() + 14 * 864e5))}`);
  await p.getByRole("button", { name: /Generar semana sugerida/ }).click();
  await p.getByText(/Semana sugerida creada/).waitFor(); ok("Pro genera una semana sugerida");
  await p.goto(BASE + `/panel/plan?semana=${iso(new Date(Date.now() + 21 * 864e5))}`);
  await p.waitForLoadState("networkidle");
  await p.getByRole("button", { name: /Copiar semana anterior/ }).click();
  await p.getByText(/sesiones copiadas/).waitFor(); ok("Pro copia la semana anterior");
  await p.goto(BASE + "/panel/perfil");
  await p.getByLabel("Sesiones / semana").fill("4");
  await p.getByRole("button", { name: "Guardar objetivos" }).click();
  await p.getByText("Objetivos guardados").waitFor(); ok("Pro guarda objetivos personalizados");
  await p.goto(BASE + "/panel/suscripcion");
  await p.getByText("FOOTLAB Pro").waitFor(); ok("la página de plan muestra Pro activo");

  const free = await makeUser(false); users.push(free.id);
  const f = await login(free.email);
  await f.goto(BASE + "/panel/suscripcion");
  await f.getByRole("button", { name: "Continuar al pago seguro" }).click();
  await f.getByText("No hemos podido iniciar el pago").waitFor({ timeout: 30000 });
  ok("si Stripe rechaza la petición (clave de prueba ficticia) se muestra un error, sin simular el pago");
  assert.equal((await admin.from("subscriptions").select("status").eq("user_id", free.id).maybeSingle()).data?.status ?? "inactive", "inactive");
  ok("el usuario gratuito sigue sin Pro");
  console.log(`\n${n} comprobaciones de Pro superadas`);
} catch (e) { console.error(e); process.exitCode = 1; }
finally { for (const id of users) await admin.auth.admin.deleteUser(id); await browser.close(); }
