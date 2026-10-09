import type { Metadata } from "next";
import { requireOnboardedAccount } from "@/lib/data";
import type { CatalogEntry } from "@/lib/types";
import { LibraryBrowser } from "@/components/panel/library-browser";

export const metadata: Metadata = { title: "Biblioteca de ejercicios" };

export default async function LibraryPage() {
  const { supabase, isPro, prefs } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("exercise_catalog");
  const catalog = (data ?? []) as CatalogEntry[];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Biblioteca de ejercicios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {catalog.length} ejercicios con instrucciones, variantes y precauciones.{" "}
          {!isPro && `${catalog.filter((e) => !e.is_pro).length} incluidos en tu plan gratuito.`}
        </p>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">No hemos podido cargar la biblioteca. Recarga la página.</p>
      ) : (
        <LibraryBrowser catalog={catalog} isPro={isPro} defaultEquipment={prefs.equipment} />
      )}
      <p className="text-xs text-muted-foreground">Las pautas de series, repeticiones y descansos son orientativas. Adáptalas a tu nivel y a las indicaciones de tu entrenador; no garantizan resultados concretos.</p>
    </div>
  );
}
