import Link from "next/link";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/forms/auth-forms";
import { getUser } from "@/lib/data";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPage() {
  const user = await getUser();
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Crea una nueva contraseña</h1>
        <p className="text-sm text-muted-foreground">{user ? `Para ${user.email}` : "Abre el enlace que te enviamos por email."}</p>
      </div>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          El enlace no es válido o ha caducado. <Link href="/recuperar" className="underline">Solicita uno nuevo</Link>.
        </div>
      )}
    </div>
  );
}
