export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { missingSupabaseVars } from "@/lib/env";
import { missingStripeVars } from "@/lib/stripe";

export const metadata: Metadata = { title: "Estado de la configuración", robots: { index: false } };

// Muestra qué integraciones están configuradas (nunca muestra valores secretos).
export default function SetupPage() {
  const supabase = missingSupabaseVars();
  const stripe = missingStripeVars();
  const rows = [
    { name: "Base de datos y autenticación (Supabase)", missing: supabase, note: "Necesario para registrarse, iniciar sesión y guardar datos." },
    { name: "Pagos (Stripe)", missing: stripe, note: "Necesario para activar el plan Pro. Sin esto, la app funciona con el plan gratuito." },
  ];
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-16">
      <Logo />
      <h1 className="text-2xl font-semibold tracking-tight">Estado de la configuración</h1>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.name} className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 font-medium">
              {r.missing.length ? <XCircle className="size-4 text-destructive" /> : <CheckCircle2 className="size-4 text-primary" />}
              {r.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>
            {r.missing.length > 0 && (
              <p className="mt-2 text-sm">Faltan: {r.missing.map((m) => <code key={m} className="mr-1 rounded bg-muted px-1 py-0.5 text-xs">{m}</code>)}</p>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Consulta el archivo README.md del proyecto para ver los pasos de configuración. <Link href="/" className="text-primary">Volver al inicio</Link></p>
    </main>
  );
}
