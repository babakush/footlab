import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type { PlayerPreferences, Profile, Subscription } from "@/lib/types";

/** Usuario autenticado verificado contra Supabase Auth (no solo la cookie). */
export const getUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getAccount = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/entrar");
  const supabase = await createClient();
  const [profileRes, prefsRes, subRes, proRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("player_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    // El plan se verifica en la base de datos, no en el cliente.
    supabase.rpc("current_user_is_pro"),
  ]);
  return {
    supabase,
    user,
    profile: profileRes.data as Profile | null,
    prefs: prefsRes.data as PlayerPreferences | null,
    subscription: subRes.data as Subscription | null,
    isPro: proRes.data === true,
  };
});

/** Para páginas del panel: exige sesión y onboarding completado. */
export async function requireOnboardedAccount() {
  const account = await getAccount();
  if (!account.profile?.onboarding_completed || !account.prefs) redirect("/onboarding");
  return account as typeof account & { profile: Profile; prefs: PlayerPreferences };
}

/** Traduce errores de la base de datos a mensajes comprensibles. */
export function friendlyDbError(message: string | undefined): string {
  if (!message) return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
  if (message.includes("FREE_PLAN_WEEKLY_LIMIT"))
    return "El plan gratuito permite 5 sesiones personales por semana. Pásate a Pro para planificar sin límite.";
  if (message.includes("PRO_REQUIRED")) return "Esta función forma parte del plan Pro.";
  if (message.includes("completed_requires_minutes")) return "Indica la duración real para marcar la sesión como completada.";
  if (message.includes("duplicate key") && message.includes("log_date"))
    return "Ya tienes un registro para ese día.";
  if (message.includes("violates check constraint")) return "Alguno de los valores no es válido.";
  if (message.includes("row-level security")) return "No tienes permiso para realizar esta acción.";
  return "No se ha podido guardar. Inténtalo de nuevo.";
}
