// Lógica de planificación sugerida. Es deliberadamente prudente: respeta el día
// de partido, evita cargas intensas cerca de la competición y deja descanso.
import { addDaysISO, isoWeekday, weekDaysISO } from "./dates";
import type { Equipment, Goal, Level, SessionType } from "./constants";
import { SESSION_TYPES } from "./constants";

export const INTENSE_TYPES: SessionType[] = ["fuerza", "velocidad", "agilidad", "resistencia"];

export interface PlanningPrefs {
  goal: Goal;
  level: Level;
  equipment: Equipment;
  available_days: number[];
  team_days: number[];
  match_day: number | null;
}

export interface LibraryLite {
  id: string;
  slug: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  prescription: string | null;
  is_pro: boolean;
}

export interface SuggestedSession {
  session_date: string;
  session_type: SessionType;
  title: string;
  planned_minutes: number;
  exercises: { exercise_id: string; name: string; prescription: string | null }[];
}

const GOAL_ROTATION: Record<Goal, SessionType[]> = {
  velocidad: ["velocidad", "fuerza", "tecnica"],
  fuerza: ["fuerza", "velocidad", "fuerza"],
  resistencia: ["resistencia", "fuerza", "tecnica"],
  tecnica: ["tecnica", "fuerza", "agilidad"],
  agilidad: ["agilidad", "fuerza", "velocidad"],
  rendimiento_general: ["fuerza", "velocidad", "resistencia"],
};

const TYPE_CATEGORIES: Partial<Record<SessionType, string[]>> = {
  fuerza: ["fuerza_piernas", "core"],
  velocidad: ["aceleracion", "coordinacion"],
  agilidad: ["cambios_direccion", "coordinacion"],
  resistencia: ["resistencia"],
  tecnica: ["tecnica"],
  movilidad: ["movilidad"],
  recuperacion: ["movilidad", "resistencia"],
};

const TITLES: Partial<Record<SessionType, string>> = {
  fuerza: "Fuerza de piernas y core",
  velocidad: "Aceleración y velocidad",
  agilidad: "Agilidad y cambios de dirección",
  resistencia: "Resistencia intermitente",
  tecnica: "Técnica individual con balón",
  movilidad: "Movilidad y activación",
  recuperacion: "Recuperación activa",
  equipo: "Entrenamiento con el equipo",
  partido: "Partido",
};

const LEVEL_MINUTES: Record<Level, number> = {
  principiante: 30,
  amateur: 40,
  juvenil_competitivo: 45,
  semiprofesional: 50,
};

const LEVEL_MAX_INTENSE: Record<Level, number> = {
  principiante: 2,
  amateur: 2,
  juvenil_competitivo: 3,
  semiprofesional: 3,
};

const EQUIPMENT_RANK: Record<string, number> = { sin_material: 0, material_basico: 1, gimnasio: 2 };
const DIFFICULTY_RANK: Record<string, number> = { basico: 0, intermedio: 1, avanzado: 2 };
const LEVEL_DIFFICULTY: Record<Level, number> = {
  principiante: 0,
  amateur: 1,
  juvenil_competitivo: 2,
  semiprofesional: 2,
};

/** Distancia (en días, con semana circular) al partido. 0 = día de partido, 1 = víspera. */
function daysUntilMatch(day: number, matchDay: number | null): number | null {
  if (!matchDay) return null;
  return (matchDay - day + 7) % 7;
}

function daysAfterMatch(day: number, matchDay: number | null): number | null {
  if (!matchDay) return null;
  return (day - matchDay + 7) % 7;
}

/** Aviso cuando una sesión exigente queda demasiado cerca del partido. */
export function matchProximityWarning(
  dateISO: string,
  type: SessionType,
  matchDay: number | null,
): string | null {
  if (!INTENSE_TYPES.includes(type)) return null;
  const until = daysUntilMatch(isoWeekday(dateISO), matchDay);
  if (until === 0) return "Es tu día habitual de partido. Evita sesiones físicas exigentes antes de competir.";
  if (until === 1) return "Es la víspera de tu partido. Mejor una sesión suave de movilidad o técnica.";
  return null;
}

export function pickExercises(
  type: SessionType,
  library: LibraryLite[],
  opts: { equipment: Equipment; level: Level; isMinor: boolean; isPro: boolean; count?: number },
) {
  const categories = TYPE_CATEGORIES[type];
  if (!categories) return [];
  const maxDifficulty = Math.min(LEVEL_DIFFICULTY[opts.level], opts.isMinor ? 1 : 2);
  const eligible = library.filter(
    (e) =>
      categories.includes(e.category) &&
      EQUIPMENT_RANK[e.equipment] <= EQUIPMENT_RANK[opts.equipment] &&
      DIFFICULTY_RANK[e.difficulty] <= maxDifficulty &&
      (opts.isPro || !e.is_pro),
  );
  const count = opts.count ?? (type === "recuperacion" || type === "movilidad" ? 2 : 3);
  // Alternamos categorías para que la sesión quede equilibrada.
  const byCat = categories.map((c) => eligible.filter((e) => e.category === c));
  const result: LibraryLite[] = [];
  let i = 0;
  while (result.length < count && byCat.some((l) => l.length)) {
    const list = byCat[i % byCat.length];
    const next = list.shift();
    if (next) result.push(next);
    i++;
  }
  return result.map((e) => ({ exercise_id: e.id, name: e.name, prescription: e.prescription }));
}

export function suggestWeek(
  prefs: PlanningPrefs,
  weekStart: string,
  library: LibraryLite[],
  opts: { age: number | null; isPro: boolean; fromDate?: string; maxPersonal?: number },
): SuggestedSession[] {
  const isMinor = opts.age !== null && opts.age < 18;
  const days = weekDaysISO(weekStart);
  const plan = new Map<number, SessionType>();
  const team = new Set(prefs.team_days);
  const available = new Set(prefs.available_days);

  // 1. Compromisos fijos: partido y entrenamientos de equipo.
  if (prefs.match_day) plan.set(prefs.match_day, "partido");
  team.forEach((d) => {
    if (d !== prefs.match_day) plan.set(d, "equipo");
  });

  // 2. Recuperación tras el partido y activación suave en la víspera.
  const personalDays = [1, 2, 3, 4, 5, 6, 7].filter((d) => available.has(d) && !plan.has(d));
  for (const d of personalDays) {
    if (daysAfterMatch(d, prefs.match_day) === 1) plan.set(d, "recuperacion");
    else if (daysUntilMatch(d, prefs.match_day) === 1) plan.set(d, "movilidad");
  }

  // 3. Sesiones de calidad según el objetivo, sin pasarse de carga.
  let maxIntense = LEVEL_MAX_INTENSE[prefs.level];
  if (isMinor) maxIntense = Math.min(maxIntense, 2);
  if (team.size >= 3) maxIntense = Math.max(1, maxIntense - 1);

  const rotation = GOAL_ROTATION[prefs.goal];
  let intenseCount = 0;
  let rotationIndex = 0;
  for (const d of personalDays) {
    if (plan.has(d)) continue;
    const until = daysUntilMatch(d, prefs.match_day);
    const nearMatch = until !== null && until <= 2; // MD-2 o más cerca
    const prevIntense = INTENSE_TYPES.includes(plan.get(d - 1) as SessionType) || plan.get(d - 1) === "partido";

    if (intenseCount < maxIntense && !nearMatch && !prevIntense) {
      const type = rotation[rotationIndex % rotation.length];
      rotationIndex++;
      if (type === "tecnica") {
        plan.set(d, "tecnica");
      } else {
        plan.set(d, type);
        intenseCount++;
      }
    } else if (nearMatch || prevIntense) {
      // Cerca del partido o tras un día exigente: técnica o movilidad.
      plan.set(d, nearMatch ? "tecnica" : "movilidad");
    }
    // Si se alcanzó el máximo de sesiones intensas, el día queda libre (descanso).
  }

  // 4. Garantizar al menos un día completo de descanso.
  if (plan.size >= 7) {
    const removable = [...plan.entries()].find(([, t]) => t === "movilidad" || t === "tecnica");
    if (removable) plan.delete(removable[0]);
  }

  // 5. Respetar el máximo de sesiones personales (plan gratuito), quitando primero las más ligeras.
  const maxPersonal = opts.maxPersonal ?? Infinity;
  const personal = () => [...plan.entries()].filter(([, t]) => t !== "equipo" && t !== "partido");
  for (const dropType of ["movilidad", "tecnica", "recuperacion"] as SessionType[]) {
    while (personal().length > maxPersonal) {
      const found = personal().find(([, t]) => t === dropType);
      if (!found) break;
      plan.delete(found[0]);
    }
  }

  const baseMinutes = LEVEL_MINUTES[prefs.level] - (isMinor ? 5 : 0);
  const sessions: SuggestedSession[] = [];
  for (const [day, type] of [...plan.entries()].sort((a, b) => a[0] - b[0])) {
    const date = days[day - 1];
    if (opts.fromDate && date < opts.fromDate) continue;
    const minutes =
      type === "partido" || type === "equipo"
        ? SESSION_TYPES[type].defaultMinutes
        : type === "movilidad" || type === "recuperacion"
          ? 20
          : baseMinutes;
    sessions.push({
      session_date: date,
      session_type: type,
      title: TITLES[type] ?? SESSION_TYPES[type].label,
      planned_minutes: minutes,
      exercises: pickExercises(type, library, {
        equipment: prefs.equipment,
        level: prefs.level,
        isMinor,
        isPro: opts.isPro,
      }),
    });
  }
  return sessions;
}

/** Siguiente fecha (desde hoy incluido) que cae en el día de partido. */
export function nextMatchDate(today: string, matchDay: number | null): string | null {
  if (!matchDay) return null;
  const diff = (matchDay - isoWeekday(today) + 7) % 7;
  return addDaysISO(today, diff);
}
