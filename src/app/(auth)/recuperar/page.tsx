import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms/auth-forms";
import { SupabaseSetupNotice } from "@/components/setup-notice";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Recupera tu contraseña</h1>
        <p className="text-sm text-muted-foreground">Te enviaremos un enlace para crear una nueva.</p>
      </div>
      <SupabaseSetupNotice />
      <ForgotPasswordForm />
      <p className="text-center text-sm text-muted-foreground"><Link href="/entrar" className="hover:text-foreground">Volver a entrar</Link></p>
    </div>
  );
}
