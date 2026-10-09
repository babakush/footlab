import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRO_PRICE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const FREE_FEATURES = [
  "Perfil deportivo y onboarding personalizado",
  "Planificador semanal básico (hasta 5 sesiones personales por semana)",
  "Registro manual de entrenamientos y recuperación",
  "Selección de ejercicios de la biblioteca",
  "Estadísticas básicas de las últimas 4 semanas",
  "Exportación de tus datos en CSV",
];

export const PRO_FEATURES = [
  "Planificador avanzado sin límite semanal",
  "Generar semana sugerida y copiar semanas",
  "Biblioteca completa de ejercicios",
  "Historial ampliado de hasta 12 meses",
  "Estadísticas avanzadas: carga, categorías y comparativas",
  "Objetivos personalizados de sesiones y minutos",
];

export function Pricing({ paymentsEnabled }: { paymentsEnabled: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">Gratis</p>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight">0 €</span>
          <span className="text-sm text-muted-foreground">/ siempre</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Todo lo necesario para organizarte y ser constante.</p>
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{f}</li>
          ))}
        </ul>
        <Button asChild variant="secondary" size="lg" className="mt-8">
          <Link href="/registro">Empieza gratis</Link>
        </Button>
      </div>

      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-primary/40 bg-card p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">Pro</p>
          <Badge variant="primary">Precio orientativo</Badge>
        </div>
        <p className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-semibold tracking-tight">{PRO_PRICE_LABEL}</span>
          <span className="text-sm text-muted-foreground">/ mes</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Para quien quiere planificar toda la temporada en serio.</p>
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          <li className="flex gap-2.5 text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0" />Todo lo del plan gratuito</li>
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{f}</li>
          ))}
        </ul>
        {paymentsEnabled ? (
          <Button asChild size="lg" className="mt-8">
            <Link href="/panel/suscripcion">Hazte Pro</Link>
          </Button>
        ) : (
          <div className="mt-8 space-y-2">
            <Button size="lg" className="w-full" disabled>
              <Lock /> Pagos todavía no disponibles
            </Button>
            <p className={cn("text-center text-xs text-muted-foreground")}>
              Estamos terminando de activar los pagos. Puedes empezar gratis y pasarte a Pro cuando esté listo.
            </p>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">Cancela cuando quieras desde tu perfil.</p>
      </div>
    </div>
  );
}
