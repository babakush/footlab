// Genera supabase/migrations/20261009000002_exercise_library_seed.sql a partir de scripts/exercises.mjs
import { writeFileSync } from "node:fs";
import { exercises } from "./exercises.mjs";

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a.length ? `array[${a.map(q).join(", ")}]::text[]` : "'{}'::text[]");

const cols = ["slug", "name", "category", "goal", "muscle_group", "exercise_type", "equipment", "equipment_detail",
  "difficulty", "duration_min", "summary", "instructions", "prescription", "rest", "common_mistakes",
  "easier_variant", "harder_variant", "safety_notes", "is_pro"];

const rows = exercises.map((e) => "  (" + cols.map((c) => {
  const v = e[c];
  if (Array.isArray(v)) return arr(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return q(v);
}).join(", ") + ")");

const sql = `-- Contenido inicial de la biblioteca de ejercicios (generado por scripts/build-exercise-seed.mjs)
insert into public.exercise_library (${cols.join(", ")}) values
${rows.join(",\n")}
on conflict (slug) do update set
${cols.filter((c) => c !== "slug").map((c) => `  ${c} = excluded.${c}`).join(",\n")};
`;
writeFileSync(new URL("../supabase/migrations/20261009000002_exercise_library_seed.sql", import.meta.url), sql);
console.log(`${exercises.length} ejercicios, ${exercises.filter((e) => e.is_pro).length} Pro`);
