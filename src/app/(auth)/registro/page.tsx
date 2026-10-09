import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/forms/auth-forms";
import { SupabaseSetupNotice } from "@/components/setup-notice";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta gratis</h1>
        <p className="text-sm text-muted-foreground">Solo te pediremos lo imprescindible para personalizar tu plan.</p>
      </div>
      <SupabaseSetupNotice />
      <SignupForm />
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta? <Link href="/entrar" className="font-medium text-foreground hover:text-primary">Entrar</Link>
      </p>
    </div>
  );
}
