import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

// Cliente con la service role key. Salta RLS: úsalo SOLO en el servidor y solo
// para operaciones que no puede hacer el propio usuario (webhook de Stripe, borrado de cuenta).
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL");
  }
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
