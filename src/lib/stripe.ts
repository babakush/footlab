import "server-only";
import Stripe from "stripe";

// Stripe solo se usa en el servidor. Nunca exponemos la clave secreta ni
// almacenamos datos de tarjeta: el pago ocurre en Stripe Checkout.

export function missingStripeVars(): string[] {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_PRICE_ID_PRO) missing.push("STRIPE_PRICE_ID_PRO");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

export function isStripeConfigured() {
  return missingStripeVars().length === 0;
}

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
  stripe ??= new Stripe(key, { appInfo: { name: "FOOTLAB" } });
  return stripe;
}
