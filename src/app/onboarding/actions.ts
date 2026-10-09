"use server";

import { redirect } from "next/navigation";
import { getAccount, friendlyDbError } from "@/lib/data";
import { onboardingSchema, firstErrors } from "@/lib/validation";
import { addDaysISO, startOfWeekISO, todayISO } from "@/lib/dates";
import { suggestWeek, type LibraryLite } from "@/lib/planning";
import { PLAN_LIMITS } from "@/lib/constants";
import { insertSuggestedSessions } from "@/lib/sessions";

export type OnboardingResult = { error?: string; fieldErrors?: Record<string, string> };

export async function completeOnboarding(input: unknown): Promise<OnboardingResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { fieldErrors: firstErrors(parsed.error), error: "Revisa los campos marcados." };
  const d = parsed.data;
  const { supabase, user, isPro, profile } = await getAccount();

  const teamDays = d.team_days.filter((t) => t !== d.match_day);
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      age: d.age,
      guardian_acknowledged: d.age < 18 ? d.guardian_acknowledged : false,
      privacy_accepted_at: profile?.privacy_accepted_at ?? user.user_metadata?.privacy_accepted_at ?? new Date().toISOString(),
    })
    .eq("id", user.id);
  if (profileError) return { error: friendlyDbError(profileError.message) };

  const { error: prefsError } = await supabase.from("player_preferences").upsert({
    user_id: user.id,
    position: d.position,
    level: d.level,
    goal: d.goal,
    equipment: d.equipment,
    available_days: d.available_days,
    team_days: teamDays,
    match_day: d.match_day,
  });
  if (prefsError) return { error: friendlyDbError(prefsError.message) };

  if (d.generate_plan) {
    const { count } = await supabase.from("training_sessions").select("id", { count: "exact", head: true });
    if (!count) {
      const { data: library } = await supabase
        .from("exercise_library")
        .select("id, slug, name, category, equipment, difficulty, prescription, is_pro");
      const today = todayISO();
      const thisWeek = startOfWeekISO(today);
      const prefs = { ...d, team_days: teamDays };
      const opts = { age: d.age, isPro, maxPersonal: isPro ? undefined : PLAN_LIMITS.free.weeklyPersonalSessions };
      const sessions = [
        ...suggestWeek(prefs, thisWeek, (library ?? []) as LibraryLite[], { ...opts, fromDate: today }),
        ...suggestWeek(prefs, addDaysISO(thisWeek, 7), (library ?? []) as LibraryLite[], opts),
      ];
      const res = await insertSuggestedSessions(supabase, sessions);
      if (res.error) return { error: res.error };
    }
  }

  const { error: doneError } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  if (doneError) return { error: friendlyDbError(doneError.message) };
  redirect("/panel?bienvenida=1");
}
