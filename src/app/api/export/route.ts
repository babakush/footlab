import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { toCSV } from "@/lib/csv";
import { SESSION_STATUS, SESSION_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/dates";

// Exporta los datos del usuario autenticado. RLS garantiza que solo se leen sus filas.
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const tipo = request.nextUrl.searchParams.get("tipo") ?? "sesiones";
  let csv: string;
  let name: string;

  if (tipo === "recuperacion") {
    const { data, error } = await supabase.from("daily_recovery_logs").select("*").order("log_date");
    if (error) return NextResponse.json({ error: "No se pudieron exportar los datos" }, { status: 500 });
    csv = toCSV(
      ["fecha", "horas_sueno", "calidad_sueno_1_5", "energia_1_5", "fatiga_muscular_1_5", "motivacion_1_5", "agua_litros_aprox", "dolor_significativo", "mareos", "notas"],
      (data ?? []).map((l) => [l.log_date, l.sleep_hours != null ? Number(l.sleep_hours) : null, l.sleep_quality, l.energy, l.muscle_fatigue, l.motivation,
        l.hydration_liters != null ? Number(l.hydration_liters) : null, l.significant_pain, l.dizziness, l.notes]),
    );
    name = "recuperacion";
  } else if (tipo === "records") {
    const { data, error } = await supabase.from("personal_records").select("*").order("recorded_on");
    if (error) return NextResponse.json({ error: "No se pudieron exportar los datos" }, { status: 500 });
    csv = toCSV(["fecha", "record", "valor", "unidad", "notas"], (data ?? []).map((r) => [r.recorded_on, r.label, Number(r.value), r.unit, r.notes]));
    name = "records";
  } else {
    const { data, error } = await supabase
      .from("training_sessions")
      .select("session_date, session_type, title, status, planned_minutes, actual_minutes, rpe, distance_km, notes, source, session_exercises(name, prescription, position)")
      .order("session_date");
    if (error) return NextResponse.json({ error: "No se pudieron exportar los datos" }, { status: 500 });
    csv = toCSV(
      ["fecha", "tipo", "titulo", "estado", "minutos_previstos", "minutos_reales", "rpe_1_10", "distancia_km_introducida", "ejercicios", "notas", "origen"],
      (data ?? []).map((s) => [
        s.session_date,
        SESSION_TYPES[s.session_type as keyof typeof SESSION_TYPES]?.label ?? s.session_type,
        s.title,
        SESSION_STATUS[s.status as keyof typeof SESSION_STATUS] ?? s.status,
        s.planned_minutes, s.actual_minutes, s.rpe, s.distance_km != null ? Number(s.distance_km) : null,
        (s.session_exercises ?? []).sort((a, b) => a.position - b.position).map((e) => (e.prescription ? `${e.name} (${e.prescription})` : e.name)).join(" | "),
        s.notes,
        s.source === "sugerida" ? "Sugerida por FOOTLAB" : "Manual",
      ]),
    );
    name = "entrenamientos";
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="footlab-${name}-${todayISO()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
