"use server";

import { redirect } from "next/navigation";
import { getAccount } from "@/lib/data";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

export type BillingState = { error?: string } | undefined;

export async function startCheckout(): Promise<BillingState> {
  if (!isStripeConfigured()) return { error: "Los pagos todavía no están disponibles." };
  const { user, isPro, subscription } = await getAccount();
  if (isPro) redirect("/panel/suscripcion");

  const stripe = getStripe();
  let url: string | null = null;
  try {
    let customerId = subscription?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
      customerId = customer.id;
      const { error } = await createAdminClient()
        .from("subscriptions")
        .upsert({ user_id: user.id, stripe_customer_id: customerId, status: "inactive" }, { onConflict: "user_id" });
      if (error) throw error;
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO!, quantity: 1 }],
      subscription_data: { metadata: { user_id: user.id } },
      allow_promotion_codes: true,
      locale: "es",
      success_url: `${siteUrl()}/panel/suscripcion?estado=procesando`,
      cancel_url: `${siteUrl()}/panel/suscripcion?estado=cancelado`,
    });
    url = session.url;
  } catch (err) {
    console.error("[checkout]", err);
    return { error: "No hemos podido iniciar el pago. Inténtalo de nuevo en unos minutos." };
  }
  if (!url) return { error: "No hemos podido iniciar el pago." };
  redirect(url);
}

export async function openBillingPortal(): Promise<BillingState> {
  if (!isStripeConfigured()) return { error: "La gestión de pagos todavía no está disponible." };
  const { subscription } = await getAccount();
  if (!subscription?.stripe_customer_id) return { error: "No tienes ninguna suscripción que gestionar." };
  let url: string;
  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl()}/panel/suscripcion`,
      locale: "es",
    });
    url = portal.url;
  } catch (err) {
    console.error("[portal]", err);
    return { error: "No hemos podido abrir la gestión de la suscripción." };
  }
  redirect(url);
}
