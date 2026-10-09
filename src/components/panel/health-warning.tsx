import { AlertTriangle } from "lucide-react";
import type { RecoveryLog } from "@/lib/types";

/**
 * Aviso prudente ante síntomas preocupantes. FOOTLAB no diagnostica: recomienda
 * parar y consultar con un profesional sanitario.
 */
export function HealthWarning({ log, show }: { log: RecoveryLog | null; show: boolean }) {
  if (!show || !log) return null;
  const symptoms = [log.significant_pain && "dolor significativo", log.dizziness && "mareos"].filter(Boolean).join(" y ");
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-destructive">Has indicado {symptoms}</p>
        <p className="text-foreground/80">
          Te recomendamos no entrenar hoy y consultar con un profesional sanitario. Si los síntomas son intensos o empeoran, contacta con los servicios de urgencias (112).
        </p>
      </div>
    </div>
  );
}
