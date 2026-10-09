// Prueba del webhook de Stripe con eventos firmados localmente (sin llamar a la API de Stripe).
// Requiere la app arrancada con STRIPE_WEBHOOK_SECRET=whsec_test123 y SUPABASE_SERVICE_ROLE_KEY.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SECRET = process.env.WEBHOOK_SECRET ?? "whsec_test123";
const stripe = new Stripe("sk_test_dummy");
const admin = createClient(process.env.SUPABASE_URL, process.env.SERVICE_KEY, { auth: { persistSession: false } });
const userClient = createClient(process.env.SUPABASE_URL, process.env.ANON_KEY, { auth: { persistSession: false } });

const email = `pro${Date.now()}@example.com`;
const { data: u } = await admin.auth.admin.createUser({ email, password: "Futbol2026", email_confirm: true });
await userClient.auth.signInWithPassword({ email, password: "Futbol2026" });
const uid = u.user.id;
let n = 0; const ok = (m) => console.log(`  ✓ ${++n}. ${m}`);

async function send(event, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(BASE + "/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header, "content-type": "application/json" } });
}
const sub = (status, extra = {}) => ({
  id: "evt_" + Math.random().toString(36).slice(2), object: "event", type: extra.type ?? "customer.subscription.updated",
  data: { object: { id: "sub_test_1", object: "subscription", customer: "cus_test_1", status, cancel_at_period_end: extra.cancel ?? false,
    metadata: { user_id: uid }, items: { data: [{ price: { id: "price_dummy" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] } } },
});

const bad = await send(sub("active"), "whsec_wrong");
assert.equal(bad.status, 400); ok("rechaza eventos con firma no válida");
const noSig = await fetch(BASE + "/api/stripe/webhook", { method: "POST", body: "{}" });
assert.equal(noSig.status, 400); ok("rechaza peticiones sin firma");
assert.equal((await userClient.rpc("current_user_is_pro")).data, false); ok("sin evento verificado el usuario sigue en plan gratuito");

const r1 = await send(sub("active", { type: "customer.subscription.created" }));
assert.equal(r1.status, 200);
assert.equal((await userClient.rpc("current_user_is_pro")).data, true); ok("subscription.created activa Pro (verificado en BD)");

await send(sub("active", { cancel: true }));
const { data: row } = await userClient.from("subscriptions").select("cancel_at_period_end, status").single();
assert.equal(row.cancel_at_period_end, true); ok("cancelación al final del periodo reflejada");

await send(sub("past_due"));
assert.equal((await userClient.rpc("current_user_is_pro")).data, false); ok("pago pendiente (past_due) retira Pro");

await send(sub("canceled", { type: "customer.subscription.deleted" }));
assert.equal((await userClient.rpc("current_user_is_pro")).data, false); ok("subscription.deleted deja al usuario sin Pro");

await admin.auth.admin.deleteUser(uid);
console.log(`\n${n} comprobaciones del webhook superadas`);
