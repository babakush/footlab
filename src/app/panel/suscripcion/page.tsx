import type { Metadata } from "next";
import { Check, Clock, CreditCard, Info, Lock } from "lucide-react";
import { requireOnboardedAccount } from "@/lib/data";
import { isStripeConfigured, missingStripeVars } from "@/lib/stripe";
import { PRO_FEATURES } from "@/components/marketing/pricing";
import { PRO_PRICE_LABEL } from "@/lib/constants";
import { formatNumeric } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BillingButton } from "./billing-button";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Plan" };

const STATUS_LABELS: Record<string, string> = {
  active: "Activa", trialing: "En periodo de prueba", past_due: "Pago pendiente", unpaid: "Impagada",
  canceled: "Cancelada", incomplete: "Pendiente de confirmar", incomplete_expired: "Caducada", paused: "En pausa", inactive: "Sin suscripción",
};

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const { isPro, subscription } = await requireOnboardedAccount();
  const paymentsEnabled = isStripeConfigured();
  const missing = missingStripeVars();
  const periodEnd = subscription?.current_period_end ? formatNumeric(subscription.current_period_end.slice(0, 10)) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tu plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">El estado de tu plan se verifica en nuestro servidor con la información de Stripe.</p>
      </div>

      {estado === "procesando" && !isPro && (
        <div role="status" className="flex gap-3 rounded-xl border border-info/30 bg-info/10 p-4 text-sm">
          <Clock className="mt-0.5 size-4 shrink-0 text-info" />
          <p>Estamos esperando la confirmación del pago por parte de Stripe. Recarga la página en unos segundos; activaremos Pro en cuanto se confirme.</p>
        </div>
      )}
      {estado === "cancelado" && (
        <div role="status" className="flex gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" /><p>Has cancelado el proceso de pago. No se ha realizado ningún cargo.</p>
        </div>
      )}

      {isPro ? (
        <Card className="space-y-5 p-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">FOOTLAB Pro</p>
            <Badge variant="primary">{STATUS_LABELS[subscription?.status ?? "active"]}</Badge>
          </div>
          {periodEnd && (
            <p className="text-sm text-muted-foreground">
              {subscription?.cancel_at_period_end ? `Tu suscripción se cancelará el ${periodEnd}. Hasta entonces mantienes Pro.` : `Próxima renovación: ${periodEnd}.`}
            </p>
          )}
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {PRO_FEATURES.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>)}
          </ul>
          {paymentsEnabled ? (
            <BillingButton action={openBillingPortal} variant="secondary"><CreditCard /> Gestionar suscripción, cambiar plan o cancelar</BillingButton>
          ) : (
            <p className="text-sm text-muted-foreground">La gestión de pagos no está disponible en este momento.</p>
          )}
        </Card>
      ) : (
        <Card className="relative space-y-5 overflow-hidden border-primary/30 p-6">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">Pásate a Pro</p>
              <p className="text-sm text-muted-foreground">Planifica toda la temporada sin límites.</p>
            </div>
            <p className="text-right"><span className="text-2xl font-semibold">{PRO_PRICE_LABEL}</span><span className="block text-xs text-muted-foreground">al mes · orientativo</span></p>
          </div>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {PRO_FEATURES.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>)}
          </ul>
          {subscription && ["past_due", "unpaid", "incomplete"].includes(subscription.status) && (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              Tu suscripción tiene un pago pendiente ({STATUS_LABELS[subscription.status]}). Revísalo para recuperar Pro.
            </p>
          )}
          {paymentsEnabled ? (
            <div className="space-y-2">
              <BillingButton action={startCheckout} size="lg" className="w-full">Continuar al pago seguro</BillingButton>
              {subscription?.stripe_customer_id && (
                <BillingButton action={openBillingPortal} variant="ghost" size="sm" className="w-full">Ver mis facturas y método de pago</BillingButton>
              )}
              <p className="text-center text-xs text-muted-foreground">El pago se realiza en Stripe. FOOTLAB nunca ve ni guarda los datos de tu tarjeta. Puedes cancelar cuando quieras.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button size="lg" className="w-full" disabled><Lock /> Pagos todavía no disponibles</Button>
              <p className="text-center text-xs text-muted-foreground">Estamos terminando de activar los pagos. Mientras tanto puedes seguir usando el plan gratuito.</p>
              {process.env.NODE_ENV !== "production" && missing.length > 0 && (
                <p className="rounded-lg border border-border bg-background/50 p-3 font-mono text-[11px] text-muted-foreground">
                  Configuración pendiente (solo visible en desarrollo): {missing.join(", ")}
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
