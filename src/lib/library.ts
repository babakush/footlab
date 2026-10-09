import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface LibraryOption {
  id: string;
  name: string;
  category: string;
  prescription: string | null;
}

/** Ejercicios que el usuario puede usar (RLS devuelve solo los permitidos por su plan). */
export async function listUserLibrary(supabase: SupabaseClient): Promise<LibraryOption[]> {
  const { data } = await supabase
    .from("exercise_library")
    .select("id, name, category, prescription")
    .order("category")
    .order("name");
  return (data ?? []) as LibraryOption[];
}
