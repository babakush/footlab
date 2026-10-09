import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { getAccount } from "@/lib/data";
import { OnboardingWizard } from "./wizard";

export const metadata: Metadata = { title: "Tu perfil" };

export default async function OnboardingPage() {
  const { profile, prefs } = await getAccount();
  if (profile?.onboarding_completed && prefs) redirect("/panel");
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-xl items-center px-4"><Logo href="/onboarding" /></header>
      <main className="mx-auto max-w-xl px-4 pb-16">
        <OnboardingWizard defaultName={profile?.display_name ?? ""} />
      </main>
    </div>
  );
}
