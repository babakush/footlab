import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const KNOWN_STATUSES = new Set(["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"]);

function periodEnd(sub: Stripe.Subscription): string | null {
  // En las versiones recientes de la API el fin de periodo está en cada item.
  const itemEnd = sub.items?.data?.[0]?.current_period_end;
  const legacyEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  const ts = itemEnd ?? legacyEnd;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** Sincroniza una suscripción de Stripe con la tabla subscriptions (service role). */
export async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId = sub.metadata?.user_id as string | undefined;
  if (!userId) {
    const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error(`No se encontró el usuario para el cliente ${customerId}`);

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: KNOWN_STATUSES.has(sub.status) ? sub.status : "inactive",
      price_id: sub.items?.data?.[0]?.price?.id ?? null,
      current_period_end: periodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Error guardando la suscripción: ${error.message}`);
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.client_reference_id || !session.customer) return;
      const admin = createAdminClient();
      const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
      // Solo vinculamos cliente y suscripción; el estado lo fijan los eventos de suscripción.
      const { data: existing } = await admin.from("subscriptions").select("user_id").eq("user_id", session.client_reference_id).maybeSingle();
      if (existing) {
        await admin.from("subscriptions").update({ stripe_customer_id: customerId, ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}) }).eq("user_id", session.client_reference_id);
      } else {
        await admin.from("subscriptions").insert({ user_id: session.client_reference_id, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, status: "incomplete" });
      }
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await syncSubscription(event.data.object as Stripe.Subscription);
      return;
    default:
      return;
  }
}
