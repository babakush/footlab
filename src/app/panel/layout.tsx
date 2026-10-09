import { requireOnboardedAccount } from "@/lib/data";
import { PanelNav } from "@/components/panel/nav";
import { listUserLibrary } from "@/lib/library";
import { QuickLogProvider } from "@/components/panel/quick-log";
import { todayISO } from "@/lib/dates";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { profile, isPro, supabase, prefs } = await requireOnboardedAccount();
  const library = await listUserLibrary(supabase);
  return (
    <QuickLogProvider library={library} today={todayISO()} matchDay={prefs.match_day}>
      <div className="min-h-dvh md:pl-60">
        <PanelNav name={profile.display_name} isPro={isPro} />
        <main id="contenido" className="mx-auto max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8">{children}</main>
      </div>
    </QuickLogProvider>
  );
}
