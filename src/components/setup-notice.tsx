import { AlertTriangle } from "lucide-react";
import { missingSupabaseVars } from "@/lib/env";

/** Aviso honesto cuando Supabase no está configurado. */
export function SupabaseSetupNotice() {
  const missing = missingSupabaseVars();
  if (!missing.length) return null;
  return (
    <div role="status" className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <div className="space-y-1">
        <p className="font-medium text-warning">La base de datos todavía no está conectada</p>
        <p className="text-muted-foreground">
          El registro y el inicio de sesión no funcionarán hasta configurar Supabase. Faltan las variables:{" "}
          {missing.map((m, i) => (
            <span key={m}>
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{m}</code>
              {i < missing.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
      </div>
    </div>
  );
}
