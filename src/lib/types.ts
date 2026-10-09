import type { Equipment, Goal, Level, Position, SessionStatus, SessionType } from "./constants";

export interface Profile {
  id: string;
  display_name: string;
  age: number | null;
  onboarding_completed: boolean;
  privacy_accepted_at: string | null;
  guardian_acknowledged: boolean;
  created_at: string;
}

export interface PlayerPreferences {
  user_id: string;
  position: Position;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  available_days: number[];
  team_days: number[];
  match_day: number | null;
  weekly_sessions_target: number | null;
  weekly_minutes_target: number | null;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string | null;
  name: string;
  prescription: string | null;
  position: number;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  session_date: string;
  session_type: SessionType;
  title: string;
  planned_minutes: number | null;
  status: SessionStatus;
  actual_minutes: number | null;
  rpe: number | null;
  distance_km: number | null;
  notes: string | null;
  source: "manual" | "sugerida";
  completed_at: string | null;
  session_exercises?: SessionExercise[];
}

export interface RecoveryLog {
  id: string;
  log_date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy: number | null;
  muscle_fatigue: number | null;
  motivation: number | null;
  hydration_liters: number | null;
  significant_pain: boolean;
  dizziness: boolean;
  notes: string | null;
}

export interface PersonalRecord {
  id: string;
  label: string;
  value: number;
  unit: string;
  recorded_on: string;
  notes: string | null;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  category: string;
  goal: string;
  muscle_group: string;
  exercise_type: string;
  equipment: string;
  equipment_detail: string | null;
  difficulty: string;
  duration_min: number;
  summary: string;
  instructions: string[];
  prescription: string | null;
  rest: string | null;
  common_mistakes: string[];
  easier_variant: string | null;
  harder_variant: string | null;
  safety_notes: string[];
  is_pro: boolean;
}

export type CatalogEntry = Pick<
  Exercise,
  "id" | "slug" | "name" | "category" | "goal" | "muscle_group" | "exercise_type" | "equipment" | "difficulty" | "duration_min" | "is_pro"
> & { summary: string | null };

export interface Subscription {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
}

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };
