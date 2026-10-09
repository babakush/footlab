import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SuggestedSession } from "./planning";
import { friendlyDbError } from "./data";

/** Inserta sesiones sugeridas con sus ejercicios. RLS garantiza que son del usuario. */
export async function insertSuggestedSessions(supabase: SupabaseClient, sessions: SuggestedSession[]) {
  if (!sessions.length) return { inserted: 0 };
  const { data, error } = await supabase
    .from("training_sessions")
    .insert(
      sessions.map((s) => ({
        session_date: s.session_date,
        session_type: s.session_type,
        title: s.title,
        planned_minutes: s.planned_minutes,
        source: "sugerida",
      })),
    )
    .select("id, session_date, session_type");
  if (error) return { error: friendlyDbError(error.message) };

  const rows = (data ?? []).flatMap((row) => {
    const s = sessions.find((x) => x.session_date === row.session_date && x.session_type === row.session_type);
    return (s?.exercises ?? []).map((e, i) => ({
      session_id: row.id,
      exercise_id: e.exercise_id,
      name: e.name,
      prescription: e.prescription?.slice(0, 60) ?? null,
      position: i,
    }));
  });
  if (rows.length) {
    const { error: exError } = await supabase.from("session_exercises").insert(rows);
    if (exError) return { error: friendlyDbError(exError.message) };
  }
  return { inserted: data?.length ?? 0 };
}
