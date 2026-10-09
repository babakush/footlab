"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock, Lock, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORIES, DIFFICULTIES, EQUIPMENT, EXERCISE_TYPES, GOALS, MUSCLE_GROUPS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CatalogEntry } from "@/lib/types";

const DURATIONS = { corto: "Hasta 10 min", medio: "11-20 min", largo: "Más de 20 min" } as const;

type Filters = { goal: string; muscle: string; type: string; equipment: string; difficulty: string; duration: string };
const EMPTY: Filters = { goal: "", muscle: "", type: "", equipment: "", difficulty: "", duration: "" };

export function LibraryBrowser({ catalog, isPro }: { catalog: CatalogEntry[]; isPro: boolean; defaultEquipment?: string }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [f, setF] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const activeCount = Object.values(f).filter(Boolean).length;

  const results = useMemo(() => catalog.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (category && e.category !== category) return false;
    if (f.goal && e.goal !== f.goal) return false;
    if (f.muscle && e.muscle_group !== f.muscle) return false;
    if (f.type && e.exercise_type !== f.type) return false;
    if (f.equipment && e.equipment !== f.equipment) return false;
    if (f.difficulty && e.difficulty !== f.difficulty) return false;
    if (f.duration === "corto" && e.duration_min > 10) return false;
    if (f.duration === "medio" && (e.duration_min <= 10 || e.duration_min > 20)) return false;
    if (f.duration === "largo" && e.duration_min <= 20) return false;
    return true;
  }), [catalog, q, category, f]);

  const select = (key: keyof Filters, label: string, options: Record<string, string>) => (
    <div className="space-y-1.5">
      <label htmlFor={`f-${key}`} className="text-xs text-muted-foreground">{label}</label>
      <NativeSelect id={`f-${key}`} value={f[key]} onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))} className="h-10">
        <option value="">Todos</option>
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </NativeSelect>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar ejercicio" aria-label="Buscar ejercicio"
            className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-base outline-none focus:border-primary/70 md:text-sm" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters} aria-controls="filtros">
          <SlidersHorizontal /> Filtros{activeCount ? ` (${activeCount})` : ""}
        </Button>
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Categorías">
        {[["", "Todas"], ...Object.entries(CATEGORIES)].map(([k, v]) => (
          <button key={k} role="tab" aria-selected={category === k} onClick={() => setCategory(k)}
            className={cn("h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition",
              category === k ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>
            {v}
          </button>
        ))}
      </div>

      {showFilters && (
        <div id="filtros" className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6 animate-fade-up">
          {select("goal", "Objetivo", GOALS)}
          {select("muscle", "Grupo muscular", MUSCLE_GROUPS)}
          {select("type", "Tipo", EXERCISE_TYPES)}
          {select("equipment", "Equipamiento", EQUIPMENT)}
          {select("difficulty", "Dificultad", DIFFICULTIES)}
          {select("duration", "Duración", DURATIONS)}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="col-span-2 justify-self-start sm:col-span-3 lg:col-span-6" onClick={() => setF(EMPTY)}>
              <X /> Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">{results.length} {results.length === 1 ? "ejercicio" : "ejercicios"}</p>

      {results.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados" description="Prueba con otros filtros o busca por otro nombre."
          action={<Button variant="secondary" size="sm" onClick={() => { setF(EMPTY); setQ(""); setCategory(""); }}>Ver todos</Button>} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((e) => {
            const locked = e.is_pro && !isPro;
            return (
              <li key={e.id}>
                <Link href={`/panel/biblioteca/${e.slug}`}
                  className={cn("group flex h-full flex-col rounded-xl border border-border bg-card p-4 transition hover:border-foreground/25 hover:bg-elevated", locked && "opacity-80")}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-primary">{CATEGORIES[e.category as keyof typeof CATEGORIES]}</p>
                    {e.is_pro && <Badge variant={locked ? "default" : "primary"}>{locked && <Lock className="size-3" />}Pro</Badge>}
                  </div>
                  <h3 className="mt-2 font-medium leading-snug group-hover:text-primary">{e.name}</h3>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {locked ? "Disponible con el plan Pro." : e.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge><Clock className="size-3" />{e.duration_min} min</Badge>
                    <Badge>{DIFFICULTIES[e.difficulty as keyof typeof DIFFICULTIES]}</Badge>
                    <Badge>{EQUIPMENT[e.equipment as keyof typeof EQUIPMENT]}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
