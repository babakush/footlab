import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/data";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="/#funciones" className="transition hover:text-foreground">Funciones</Link>
          <Link href="/#como-funciona" className="transition hover:text-foreground">Cómo funciona</Link>
          <Link href="/precios" className="transition hover:text-foreground">Precios</Link>
          <Link href="/#faq" className="transition hover:text-foreground">Preguntas</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm"><Link href="/panel">Ir a mi panel</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link href="/entrar">Entrar</Link></Button>
              <Button asChild size="sm"><Link href="/registro">Empieza gratis</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-sm text-xs">FOOTLAB no sustituye a tu entrenador ni a un profesional sanitario. Adapta siempre las rutinas a tu estado físico.</p>
        </div>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/precios" className="hover:text-foreground">Precios</Link>
          <Link href="/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terminos" className="hover:text-foreground">Términos</Link>
          <Link href="/entrar" className="hover:text-foreground">Entrar</Link>
        </nav>
      </div>
    </footer>
  );
}
