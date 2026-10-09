// Prueba E2E de los flujos principales en un navegador real (Chromium + Playwright).
// Requiere la app en BASE_URL y un Supabase con SMTP capturado en MAIL_DIR.
// Uso: BASE_URL=http://localhost:3000 MAIL_DIR=/opt/sb/mail node tests/e2e.mjs
import { chromium } from "playwright-core";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const MAIL_DIR = process.env.MAIL_DIR ?? "/opt/sb/mail";
const OUT = new URL("./output/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const email = `jugador${Date.now()}@example.com`;
const password = "Futbol2026";
const newPassword = "Futbol2027b";
let step = 0;
const log = (m) => console.log(`  ✓ ${++step}. ${m}`);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitForMail(to, kind, after) {
  for (let i = 0; i < 40; i++) {
    const files = readdirSync(MAIL_DIR).filter((f) => Number(f.split("-")[0]) >= after).sort();
    for (const f of files.reverse()) {
      const raw = readFileSync(`${MAIL_DIR}/${f}`, "utf8");
      if (!raw.includes(to)) continue;
      const decoded = raw.replace(/=\r?\n/g, "").replace(/=3D/gi, "=").replace(/&amp;/g, "&");
      const m = decoded.match(new RegExp(`https?://[^"\\s<>]+/verify\\?token=[^"\\s<>]+type=${kind}[^"\\s<>]*`));
      if (m) return m[0];
    }
    await sleep(250);
  }
  throw new Error(`No llegó el email de tipo ${kind} para ${to}`);
}

async function toast(page, text) {
  await page.getByText(text).first().waitFor({ timeout: 10000 });
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "es-ES", timezoneId: "Europe/Madrid" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

try {
  // ── Landing ──
  await page.goto(BASE);
  await page.getByRole("heading", { name: /Entrena con propósito/ }).waitFor();
  assert.ok(await page.getByText("Pagos todavía no disponibles").first().isVisible());
  await page.screenshot({ path: OUT + "01-landing-desktop.png", fullPage: true });
  log("landing con hero, precios y aviso honesto de pagos no disponibles");

  // ── Protección de rutas ──
  await page.goto(BASE + "/panel/plan");
  assert.match(page.url(), /\/entrar\?next=%2Fpanel%2Fplan/);
  log("las rutas privadas redirigen a /entrar");

  // ── Registro + confirmación por email ──
  await page.goto(BASE + "/registro");
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await page.getByText("Introduce un email válido").waitFor();
  log("validación del formulario de registro");
  const before = Date.now();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Tengo 14 años o más.").check();
  await page.locator('input[name="privacy"]').check();
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await page.getByText("Revisa tu correo").waitFor();
  log("registro con email y contraseña (pide confirmación)");

  const confirmLink = await waitForMail(email, "signup", before - 1000);
  await page.goto(confirmLink);
  await page.waitForURL(/\/onboarding/);
  log("enlace de confirmación abre sesión y lleva al onboarding");

  // ── Onboarding (usuario menor: 16 años) ──
  await page.getByLabel("¿Cómo quieres que te llamemos?").fill("Alex");
  await page.getByLabel("Edad").fill("12");
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByText("FOOTLAB está disponible a partir de 14 años").waitFor();
  await page.getByLabel("Edad").fill("16");
  await page.getByText("Como eres menor de edad").waitFor();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("radio", { name: "Extremo" }).click();
  await page.getByRole("radio", { name: "Juvenil competitivo" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("radio", { name: "Velocidad" }).click();
  await page.getByRole("radio", { name: "Material básico" }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("group", { name: "Día de partido" }).getByRole("button", { name: "Sábado" }).click();
  for (const d of ["Martes", "Jueves"]) await page.getByRole("group", { name: "Días con el equipo" }).getByRole("button", { name: d }).click();
  for (const d of ["Lunes", "Miércoles", "Viernes", "Domingo"]) await page.getByRole("group", { name: "Días disponibles" }).getByRole("button", { name: d }).click();
  await page.getByRole("button", { name: /Continuar/ }).click();
  await page.getByRole("button", { name: "Empezar a entrenar" }).click();
  await page.getByText("Necesitamos esta confirmación para continuar").waitFor();
  await page.getByText("Revisaré mis rutinas con mi entrenador").click();
  await page.getByRole("button", { name: "Empezar a entrenar" }).click();
  await page.waitForURL(/\/panel(\?|$)/);
  await page.getByRole("heading", { name: /Alex/ }).waitFor();
  log("onboarding completo (con bloqueo <14 años y confirmación de tutor para menores)");

  await page.goto(BASE + "/panel/plan");
  await page.getByRole("heading", { name: "Planificador" }).waitFor();
  const planText = await page.locator("main").innerText();
  assert.ok(/Partido|Entrenamiento con el equipo/.test(planText), "la semana sugerida incluye partido/equipo");
  log("planificación inicial sugerida creada respetando equipo y partido");

  // ── Dashboard: registrar entrenamiento rápido ──
  await page.goto(BASE + "/panel");
  await page.getByRole("button", { name: "Registrar entrenamiento" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByRole("button", { name: "Guardar entrenamiento" }).click();
  await dlg.getByText("Indica entre 1 y 400 minutos").waitFor();
  await dlg.getByLabel("Título").fill("Fuerza en casa");
  await dlg.getByLabel("Minutos reales").fill("45");
  await dlg.getByRole("radio", { name: "7" }).click();
  await dlg.getByRole("button", { name: "Añadir ejercicios" }).click();
  await dlg.getByRole("button", { name: /Sentadilla goblet/ }).click();
  await dlg.getByRole("button", { name: "Guardar entrenamiento" }).click();
  await toast(page, "Entrenamiento registrado");
  await page.locator("main").getByText("Fuerza en casa").first().waitFor({ timeout: 10000 });
  const dash = await page.locator("main").innerText();
  assert.ok(/Minutos esta semana\s*45/.test(dash), "los minutos aparecen en el resumen");
  await page.screenshot({ path: OUT + "02-dashboard-desktop.png", fullPage: true });
  log("registro rápido de entrenamiento y dashboard con datos reales");

  // ── Planificador: añadir, completar, reprogramar y borrar ──
  await page.goto(BASE + "/panel/plan");
  await page.getByRole("button", { name: "Añadir sesión", exact: true }).click();
  const d2 = page.getByRole("dialog");
  await d2.getByRole("tab", { name: "Planificar" }).click();
  await d2.getByRole("radio", { name: "Técnica" }).click();
  await d2.getByLabel("Título").fill("Técnica de prueba");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  await d2.getByLabel("Fecha").fill(today);
  await d2.getByRole("button", { name: "Añadir al plan" }).click();
  await toast(page, "Sesión añadida");
  const card = page.locator("article:visible", { hasText: "Técnica de prueba" }).first();
  await card.waitFor();
  await card.getByRole("button", { name: "Completar" }).click();
  const d3 = page.getByRole("dialog");
  await d3.getByLabel("Minutos reales").fill("30");
  await d3.getByRole("radio", { name: "5" }).click();
  await d3.getByRole("button", { name: "Guardar" }).click();
  await toast(page, "¡Sesión completada!");
  log("añadir sesión y marcarla como completada con duración y RPE");

  await page.locator("article:visible", { hasText: "Técnica de prueba" }).first().getByRole("button", { name: /Opciones de/ }).click();
  await page.getByRole("menuitem", { name: "Editar o reprogramar" }).click();
  const d4 = page.getByRole("dialog");
  await d4.getByLabel("Notas").fill("Buenas sensaciones");
  await d4.getByRole("button", { name: "Guardar cambios" }).click();
  await toast(page, "Sesión actualizada");
  log("editar sesión (notas / fecha)");

  await page.locator("article:visible", { hasText: "Técnica de prueba" }).first().getByRole("button", { name: /Opciones de/ }).click();
  await page.getByRole("menuitem", { name: "Eliminar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await toast(page, "Sesión eliminada");
  log("eliminar sesión con confirmación");

  // ── Límite del plan gratuito en el planificador ──
  const future = new Date(Date.now() + 28 * 864e5);
  const fISO = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(future);
  await page.goto(BASE + `/panel/plan?semana=${fISO}`);
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Añadir sesión", exact: true }).click();
    const d = page.getByRole("dialog");
    await d.getByRole("button", { name: "Añadir al plan" }).click();
    if (i < 5) { await toast(page, "Sesión añadida"); await page.getByRole("dialog").waitFor({ state: "detached" }); }
    else await toast(page, "El plan gratuito permite 5 sesiones personales por semana");
  }
  await page.keyboard.press("Escape");
  log("límite de 5 sesiones personales/semana aplicado y explicado al usuario");

  // ── Biblioteca ──
  await page.goto(BASE + "/panel/biblioteca");
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: "Core" }).click();
  await page.getByRole("link", { name: /Plancha frontal/ }).click();
  await page.waitForURL(/\/panel\/biblioteca\/plancha-frontal/);
  await page.getByRole("heading", { level: 1, name: "Plancha frontal" }).waitFor();
  await page.getByText("Errores comunes").waitFor();
  await page.goto(BASE + "/panel/biblioteca/pallof-press");
  await page.getByText("forma parte de la biblioteca completa del plan Pro").waitFor();
  log("biblioteca filtrable, ficha completa y ejercicios Pro bloqueados en servidor");

  // ── Recuperación ──
  await page.goto(BASE + "/panel/recuperacion");
  await page.getByLabel("Sueño (h)").fill("6,5");
  await page.getByRole("radiogroup", { name: "Energía" }).getByRole("radio", { name: "2" }).click();
  await page.getByRole("radiogroup", { name: "Fatiga muscular" }).getByRole("radio", { name: "4" }).click();
  await page.getByLabel("Dolor significativo").check();
  await page.getByText("No entrenes hoy y consulta con un profesional sanitario").waitFor();
  await page.getByRole("button", { name: "Guardar registro" }).click();
  await toast(page, "Registro guardado");
  await page.getByText("Has indicado dolor significativo").waitFor();
  log("registro de recuperación y aviso prudente ante dolor significativo");

  // ── Progreso ──
  await page.goto(BASE + "/panel/progreso");
  await page.getByText("Minutos por semana").waitFor();
  await page.getByText("Estadísticas avanzadas").waitFor();
  await page.screenshot({ path: OUT + "03-progreso-desktop.png", fullPage: true });
  log("progreso con gráficos y estadísticas Pro bloqueadas");

  // ── Perfil: récord, exportación, plan ──
  await page.goto(BASE + "/panel/perfil");
  await page.getByLabel("Récord").fill("Sprint 30 m");
  await page.getByLabel("Valor").fill("4,35");
  await page.getByLabel("Unidad").fill("s");
  await page.getByRole("button", { name: "Añadir récord" }).click();
  await toast(page, "Récord guardado");
  const csv = await page.request.get(BASE + "/api/export?tipo=sesiones");
  assert.equal(csv.status(), 200);
  const csvText = await csv.text();
  assert.ok(csvText.includes("fecha;tipo;titulo") && csvText.includes("Fuerza en casa"));
  const csvRec = await (await page.request.get(BASE + "/api/export?tipo=records")).text();
  assert.ok(csvRec.includes("Sprint 30 m;4,35;s"));
  log("récord personal y exportación CSV con los datos del usuario");

  const anonCtx = await browser.newContext();
  const anonRes = await anonCtx.request.get(BASE + "/api/export");
  assert.equal(anonRes.status(), 401);
  await anonCtx.close();
  log("la exportación exige sesión (401 sin autenticar)");

  await page.goto(BASE + "/panel/suscripcion");
  await page.getByRole("button", { name: /Pagos todavía no disponibles/ }).waitFor();
  log("página de plan sin simular pagos cuando Stripe no está configurado");

  // ── Cerrar sesión ──
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/panel");
  await page.waitForURL(/\/entrar/);
  log("cierre de sesión");

  // ── Recuperación de contraseña ──
  await page.goto(BASE + "/recuperar");
  const before2 = Date.now();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Enviar enlace" }).click();
  await page.getByText("Si existe una cuenta con ese email").waitFor();
  const recoveryLink = await waitForMail(email, "recovery", before2 - 1000);
  await page.goto(recoveryLink);
  await page.waitForURL(/\/restablecer/);
  await page.getByLabel("Nueva contraseña").fill(newPassword);
  await page.getByLabel("Repite la contraseña").fill(newPassword);
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await page.waitForURL(/\/panel/);
  await toast(page, "Contraseña actualizada");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.waitForURL(BASE + "/");
  log("recuperación de contraseña por email");

  // ── Inicio de sesión ──
  await page.goto(BASE + "/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByText("Email o contraseña incorrectos.").waitFor();
  await page.getByLabel("Contraseña", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/panel/);
  log("inicio de sesión (rechaza la contraseña antigua, acepta la nueva)");

  // ── Persistencia de sesión ──
  const ctx2 = await browser.newContext({ storageState: await ctx.storageState() });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + "/panel/perfil");
  await p2.getByText("Sprint 30 m").waitFor();
  await ctx2.close();
  log("la sesión persiste entre pestañas/recargas");

  // ── Vista móvil ──
  const mobile = await browser.newContext({ storageState: await ctx.storageState(), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "es-ES", timezoneId: "Europe/Madrid" });
  const mp = await mobile.newPage();
  await mp.goto(BASE + "/panel");
  await mp.getByRole("navigation", { name: "Navegación principal" }).waitFor();
  await mp.screenshot({ path: OUT + "04-dashboard-mobile.png", fullPage: true });
  await mp.goto(BASE + "/panel/plan");
  await mp.screenshot({ path: OUT + "05-plan-mobile.png", fullPage: true });
  await mp.getByRole("button", { name: "Registrar entrenamiento" }).click();
  await mp.getByRole("dialog").waitFor();
  await mp.screenshot({ path: OUT + "06-registro-mobile.png" });
  await mp.goto(BASE + "/");
  await mp.screenshot({ path: OUT + "07-landing-mobile.png", fullPage: true });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert.equal(overflow, false, "sin scroll horizontal en móvil");
  await mobile.close();
  log("navegación móvil y sin desbordamiento horizontal");

  // ── Borrar cuenta ──
  await page.goto(BASE + "/panel/perfil");
  await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const ad = page.getByRole("alertdialog");
  assert.ok(await ad.getByRole("button", { name: "Eliminar definitivamente" }).isDisabled());
  await ad.getByLabel("Escribe ELIMINAR para confirmar").fill("ELIMINAR");
  await ad.getByRole("button", { name: "Eliminar definitivamente" }).click();
  await page.waitForURL(/cuenta=eliminada/);
  await page.goto(BASE + "/entrar");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByText("Email o contraseña incorrectos.").waitFor();
  log("eliminación de cuenta con confirmación (ya no se puede entrar)");

  assert.deepEqual(errors, [], "sin errores de JavaScript en el navegador");
  log("sin errores de JavaScript en consola");
  console.log(`\nE2E OK: ${step} comprobaciones`);
} catch (e) {
  await page.screenshot({ path: OUT + "error.png", fullPage: true }).catch(() => {});
  console.error("\n✗ Falló en el paso", step + 1, "\n", e);
  if (errors.length) console.error("Errores JS:", errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
