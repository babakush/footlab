export const POSITIONS = {
  portero: "Portero",
  central: "Central",
  lateral: "Lateral",
  mediocentro: "Mediocentro",
  extremo: "Extremo",
  delantero: "Delantero",
} as const;

export const LEVELS = {
  principiante: "Principiante",
  amateur: "Amateur",
  juvenil_competitivo: "Juvenil competitivo",
  semiprofesional: "Semiprofesional",
} as const;

export const GOALS = {
  velocidad: "Velocidad",
  fuerza: "Fuerza",
  resistencia: "Resistencia",
  tecnica: "Técnica",
  agilidad: "Agilidad",
  rendimiento_general: "Rendimiento general",
} as const;

export const EQUIPMENT = {
  gimnasio: "Gimnasio",
  material_basico: "Material básico",
  sin_material: "Sin material",
} as const;

export const SESSION_TYPES = {
  fuerza: { label: "Fuerza", short: "Fuerza", color: "#c6f432", defaultMinutes: 45 },
  velocidad: { label: "Velocidad y aceleración", short: "Velocidad", color: "#f5b544", defaultMinutes: 35 },
  agilidad: { label: "Agilidad y cambios de dirección", short: "Agilidad", color: "#ff8a4c", defaultMinutes: 35 },
  resistencia: { label: "Resistencia", short: "Resistencia", color: "#6cb6ff", defaultMinutes: 40 },
  tecnica: { label: "Técnica individual", short: "Técnica", color: "#b48cff", defaultMinutes: 40 },
  movilidad: { label: "Movilidad", short: "Movilidad", color: "#4fd1c5", defaultMinutes: 20 },
  recuperacion: { label: "Recuperación", short: "Recuperación", color: "#7dd3a8", defaultMinutes: 25 },
  equipo: { label: "Entrenamiento de equipo", short: "Equipo", color: "#9aa4b2", defaultMinutes: 90 },
  partido: { label: "Partido", short: "Partido", color: "#f2555a", defaultMinutes: 90 },
} as const;

export const SESSION_STATUS = {
  pendiente: "Pendiente",
  completada: "Completada",
  descansada: "Descansada",
} as const;

export const CATEGORIES = {
  aceleracion: "Aceleración",
  fuerza_piernas: "Fuerza de piernas",
  core: "Core",
  movilidad: "Movilidad",
  coordinacion: "Coordinación",
  tecnica: "Técnica",
  cambios_direccion: "Cambios de dirección",
  resistencia: "Resistencia",
} as const;

export const MUSCLE_GROUPS = {
  piernas: "Piernas",
  gluteos: "Glúteos",
  isquiotibiales: "Isquiotibiales",
  cuadriceps: "Cuádriceps",
  gemelos: "Gemelos y tobillo",
  core: "Core",
  cadera: "Cadera",
  tren_superior: "Tren superior",
  cuerpo_completo: "Cuerpo completo",
} as const;

export const EXERCISE_TYPES = {
  fuerza: "Fuerza",
  pliometria: "Pliometría",
  sprint: "Sprint",
  movilidad: "Movilidad",
  tecnica: "Técnica",
  resistencia: "Resistencia",
  estabilidad: "Estabilidad",
  coordinacion: "Coordinación",
} as const;

export const DIFFICULTIES = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
} as const;

// Días ISO (1 = lunes)
export const WEEKDAYS = [
  { value: 1, short: "L", label: "Lunes" },
  { value: 2, short: "M", label: "Martes" },
  { value: 3, short: "X", label: "Miércoles" },
  { value: 4, short: "J", label: "Jueves" },
  { value: 5, short: "V", label: "Viernes" },
  { value: 6, short: "S", label: "Sábado" },
  { value: 7, short: "D", label: "Domingo" },
] as const;

export const RPE_LABELS: Record<number, string> = {
  1: "Muy muy suave",
  2: "Muy suave",
  3: "Suave",
  4: "Moderado",
  5: "Algo duro",
  6: "Duro",
  7: "Muy duro",
  8: "Muy muy duro",
  9: "Casi máximo",
  10: "Máximo",
};

export type Position = keyof typeof POSITIONS;
export type Level = keyof typeof LEVELS;
export type Goal = keyof typeof GOALS;
export type Equipment = keyof typeof EQUIPMENT;
export type SessionType = keyof typeof SESSION_TYPES;
export type SessionStatus = keyof typeof SESSION_STATUS;
export type Category = keyof typeof CATEGORIES;

export const PLAN_LIMITS = {
  free: { historyWeeks: 4, weeklyPersonalSessions: 5 },
  pro: { historyWeeks: 52, weeklyPersonalSessions: Infinity },
} as const;

export const PRO_PRICE_LABEL = "7,99 €";
