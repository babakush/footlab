// Lectura centralizada de variables de entorno. Las claves secretas solo se
// leen en el servidor (este módulo no se importa desde componentes cliente
// salvo las variables NEXT_PUBLIC_*).

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function missingSupabaseVars(): string[] {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return missing;
}

export function siteUrl() {
  // En Vercel, si no se define NEXT_PUBLIC_SITE_URL, se usa el dominio de producción del proyecto.
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}
