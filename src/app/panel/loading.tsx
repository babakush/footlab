import { Skeleton } from "@/components/ui/skeleton";

export default function PanelLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
