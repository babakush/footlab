import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="space-y-4">
        <p className="font-mono text-sm text-primary">404</p>
        <h1 className="text-3xl font-semibold tracking-tight">Fuera de juego</h1>
        <p className="text-muted-foreground">La página que buscas no existe o se ha movido.</p>
        <Button asChild><Link href="/">Volver al inicio</Link></Button>
      </div>
    </main>
  );
}
