import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/forms/auth-forms";
import { SupabaseSetupNotice } from "@/components/setup-notice";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
        <p className="text-sm text-muted-foreground">Entra para ver tu semana y registrar tus sesiones.</p>
      </div>
      <SupabaseSetupNotice />
      <LoginForm next={next} linkError={error === "enlace"} />
      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta? <Link href="/registro" className="font-medium text-foreground hover:text-primary">Regístrate gratis</Link>
      </p>
    </div>
  );
}
