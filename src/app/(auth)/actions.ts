"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { emailSchema, passwordSchema, safeNext } from "@/lib/validation";

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; message?: string; email?: string } | undefined;

const NOT_CONFIGURED: AuthState = {
  error: "El acceso todavía no está disponible: falta configurar Supabase (NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY).",
};

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Todavía no has confirmado tu email. Revisa tu bandeja de entrada.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con este email.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.";
  if (m.includes("password")) return "La contraseña no cumple los requisitos de seguridad.";
  if (m.includes("same password") || m.includes("different from the old")) return "La nueva contraseña debe ser distinta de la anterior.";
  return "No hemos podido completar la operación. Inténtalo de nuevo.";
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  const fieldErrors: Record<string, string> = {};
  if (!email.success) fieldErrors.email = email.error.issues[0].message;
  if (!password.success) fieldErrors.password = password.error.issues[0].message;
  if (formData.get("age_ok") !== "on") fieldErrors.age_ok = "Debes tener al menos 14 años para registrarte.";
  if (formData.get("privacy") !== "on") fieldErrors.privacy = "Debes aceptar la política de privacidad y los términos.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data!,
    password: password.data!,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
      data: { privacy_accepted_at: new Date().toISOString() },
    },
  });
  if (error) return { error: translateAuthError(error.message), email: email.data };
  if (data.session) redirect("/onboarding");
  return {
    message: `Te hemos enviado un email a ${email.data} para confirmar tu cuenta. Abre el enlace para continuar.`,
  };
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password) {
    return { error: "Introduce tu email y tu contraseña.", email: String(formData.get("email") ?? "") };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return { error: translateAuthError(error.message), email: email.data };
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: email.error.issues[0].message } };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/restablecer`,
  });
  if (error && /rate limit|too many/i.test(error.message)) return { error: translateAuthError(error.message) };
  // Mensaje genérico: no revelamos si el email existe.
  return { message: "Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { fieldErrors: { password: password.error.issues[0].message } };
  if (formData.get("password") !== formData.get("confirm")) return { fieldErrors: { confirm: "Las contraseñas no coinciden." } };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "El enlace ha caducado. Solicita uno nuevo desde «¿Has olvidado tu contraseña?»." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: translateAuthError(error.message) };
  redirect("/panel?aviso=password");
}
