import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { Pricing } from "@/components/marketing/pricing";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = { title: "Precios" };

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Precios sencillos</h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">Empieza gratis sin tarjeta. Pasa a Pro cuando quieras planificar toda la temporada.</p>
        </div>
        <div className="mt-12"><Pricing paymentsEnabled={isStripeConfigured()} /></div>
        <div className="mt-12 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
          <p><span className="block font-medium text-foreground">Pagos con Stripe</span>FOOTLAB no almacena datos de tarjetas.</p>
          <p><span className="block font-medium text-foreground">Cancela cuando quieras</span>Desde tu perfil, sin llamadas ni formularios.</p>
          <p><span className="block font-medium text-foreground">Tus datos son tuyos</span>Expórtalos o elimínalos cuando quieras.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
