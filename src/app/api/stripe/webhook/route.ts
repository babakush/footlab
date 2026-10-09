import { NextResponse, type NextRequest } from "next/server";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/billing";

// Webhook de Stripe: única vía por la que se activa o desactiva el plan Pro.
// Verifica la firma con STRIPE_WEBHOOK_SECRET antes de procesar nada.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Stripe no está configurado" }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Falta la firma" }, { status: 400 });

  const body = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma no válida" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[stripe-webhook]", event.type, err);
    return NextResponse.json({ error: "Error procesando el evento" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
