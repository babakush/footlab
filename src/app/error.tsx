"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Algo ha fallado</h1>
        <p className="text-muted-foreground">Ha ocurrido un error inesperado. Inténtalo de nuevo.</p>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </main>
  );
}
