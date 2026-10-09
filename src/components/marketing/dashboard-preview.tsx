// Vista previa ilustrativa del panel. Los valores son un ejemplo de diseño
// y se indican como tal: no representan resultados de usuarios reales.
const bars = [38, 52, 45, 70, 62, 84, 76];
const week = [
  { d: "L", t: "Fuerza", s: "done" },
  { d: "M", t: "Equipo", s: "done" },
  { d: "X", t: "Velocidad", s: "today" },
  { d: "J", t: "Equipo", s: "pending" },
  { d: "V", t: "Movilidad", s: "pending" },
  { d: "S", t: "Partido", s: "match" },
  { d: "D", t: "Descanso", s: "rest" },
];

export function DashboardPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-x-10 -top-10 bottom-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(198,244,50,0.18),transparent_70%)]" />
      <figure className="relative overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-muted" /><span className="size-2.5 rounded-full bg-muted" /><span className="size-2.5 rounded-full bg-muted" />
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Vista previa · datos de ejemplo</span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="space-y-3 sm:col-span-2">
            <div>
              <p className="text-xs text-muted-foreground">Miércoles, 14 de octubre</p>
              <p className="text-lg font-semibold tracking-tight">Buenos días, Alex</p>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {week.map((w) => (
                <div key={w.d} className={
                  "rounded-lg border p-2 text-center " +
                  (w.s === "today" ? "border-primary bg-primary/10" : w.s === "match" ? "border-destructive/40 bg-destructive/5" : "border-border bg-background/40")
                }>
                  <p className="text-[10px] text-muted-foreground">{w.d}</p>
                  <p className={"mt-1 truncate text-[10px] font-medium " + (w.s === "rest" ? "text-muted-foreground" : "")}>{w.t}</p>
                  <div className={"mx-auto mt-1.5 size-1.5 rounded-full " + (w.s === "done" ? "bg-primary" : w.s === "today" ? "bg-primary animate-pulse" : "bg-muted")} />
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Minutos por semana</p>
                <p className="text-xs text-primary">Ejemplo</p>
              </div>
              <div className="mt-4 flex h-24 items-end gap-2" aria-hidden>
                {bars.map((b, i) => (
                  <div key={i} className={"flex-1 rounded-t-md " + (i === bars.length - 1 ? "bg-primary" : "bg-muted")} style={{ height: `${b}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Hoy</p>
              <p className="mt-1 text-sm font-semibold">Aceleración y velocidad</p>
              <p className="mt-0.5 text-xs text-muted-foreground">35 min · 3 ejercicios</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs text-muted-foreground">Racha</p>
              <p className="mt-1 text-2xl font-semibold tabular">3<span className="ml-1 text-xs font-normal text-muted-foreground">semanas</span></p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs text-muted-foreground">Próximo partido</p>
              <p className="mt-1 text-sm font-semibold">Sábado</p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <p className="text-xs text-muted-foreground">Recuperación</p>
              <div className="mt-2 h-1.5 rounded-full bg-muted"><div className="h-full w-3/4 rounded-full bg-primary" /></div>
            </div>
          </div>
        </div>
        <figcaption className="sr-only">Ilustración del panel de FOOTLAB con datos de ejemplo.</figcaption>
      </figure>
    </div>
  );
}
