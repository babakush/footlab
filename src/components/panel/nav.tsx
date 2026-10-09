"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3, BookOpen, CalendarDays, CreditCard, HeartPulse, Home, LogOut, Menu, Plus, User,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { useQuickLog } from "./quick-log";

const items = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/plan", label: "Planificador", icon: CalendarDays },
  { href: "/panel/progreso", label: "Progreso", icon: BarChart3 },
  { href: "/panel/recuperacion", label: "Recuperación", icon: HeartPulse },
  { href: "/panel/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/panel/perfil", label: "Perfil", icon: User },
];

function isActive(path: string, href: string) {
  return href === "/panel" ? path === "/panel" : path === href || path.startsWith(href + "/");
}

export function PanelNav({ name, isPro }: { name: string; isPro: boolean }) {
  const path = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { open: openQuickLog } = useQuickLog();

  return (
    <>
      {/* Escritorio */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card/40 px-3 py-5 md:flex">
        <div className="px-2"><Logo href="/panel" /></div>
        <button onClick={() => openQuickLog()} className="mx-1 mt-6 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
          <Plus className="size-4" /> Registrar entrenamiento
        </button>
        <nav aria-label="Panel" className="mt-6 flex flex-1 flex-col gap-0.5">
          {items.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
              className={cn("flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition",
                isActive(path, href) ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
              <Icon className={cn("size-4", isActive(path, href) && "text-primary")} /> {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border pt-4">
          <Link href="/panel/suscripcion" className="flex h-9 items-center justify-between rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground">
            <span className="flex items-center gap-3"><CreditCard className="size-4" /> Plan</span>
            {isPro ? <Badge variant="primary">Pro</Badge> : <Badge>Gratis</Badge>}
          </Link>
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Móvil: cabecera */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:hidden">
        <Logo href="/panel" />
        <Link href="/panel/suscripcion">{isPro ? <Badge variant="primary">Pro</Badge> : <Badge>Gratis</Badge>}</Link>
      </header>

      {/* Móvil: barra inferior */}
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid h-16 grid-cols-5">
          {[items[0], items[1]].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(path, href) ? "page" : undefined}
              className={cn("flex flex-col items-center justify-center gap-1 text-[11px]", isActive(path, href) ? "text-primary" : "text-muted-foreground")}>
              <Icon className="size-5" /> {label === "Planificador" ? "Plan" : label}
            </Link>
          ))}
          <div className="flex items-center justify-center">
            <button onClick={() => openQuickLog()} aria-label="Registrar entrenamiento"
              className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_24px_-8px_rgba(198,244,50,0.7)] active:scale-95">
              <Plus className="size-6" />
            </button>
          </div>
          <Link href="/panel/progreso" aria-current={isActive(path, "/panel/progreso") ? "page" : undefined}
            className={cn("flex flex-col items-center justify-center gap-1 text-[11px]", isActive(path, "/panel/progreso") ? "text-primary" : "text-muted-foreground")}>
            <BarChart3 className="size-5" /> Progreso
          </Link>
          <button onClick={() => setMoreOpen(true)} className={cn("flex flex-col items-center justify-center gap-1 text-[11px]",
            ["/panel/recuperacion", "/panel/biblioteca", "/panel/perfil", "/panel/suscripcion"].some((h) => isActive(path, h)) ? "text-primary" : "text-muted-foreground")}>
            <Menu className="size-5" /> Más
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent>
          <DialogTitle className="mb-4">Más opciones</DialogTitle>
          <div className="grid gap-1">
            {[items[3], items[4], items[5], { href: "/panel/suscripcion", label: isPro ? "Mi plan Pro" : "Hazte Pro", icon: CreditCard }].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMoreOpen(false)}
                className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted">
                <Icon className="size-5 text-muted-foreground" /> {label}
              </Link>
            ))}
            <form action={signOut}>
              <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm text-destructive hover:bg-muted">
                <LogOut className="size-5" /> Cerrar sesión
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
