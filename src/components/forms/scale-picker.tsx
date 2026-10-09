"use client";
import { cn } from "@/lib/utils";

interface ScalePickerProps {
  name: string;
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  lowLabel?: string;
  highLabel?: string;
  invert?: boolean;
}

/** Escala numérica (1-5, 1-10) como botones grandes; pulsar de nuevo la borra. */
export function ScalePicker({ name, min, max, value, onChange, label, lowLabel, highLabel, invert }: ScalePickerProps) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="space-y-1.5">
      <div role="radiogroup" aria-label={label} className="flex gap-1">
        {options.map((o) => {
          const active = value === o;
          const ratio = (o - min) / (max - min || 1);
          const hot = invert ? ratio : 1 - ratio;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${o}`}
              onClick={() => onChange(active ? null : o)}
              className={cn(
                "h-10 flex-1 rounded-md border text-sm font-medium tabular transition-all",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50 text-muted-foreground hover:text-foreground",
              )}
              style={!active && max - min > 0 ? { boxShadow: `inset 0 -2px 0 rgba(198,244,50,${0.05 + (1 - hot) * 0.25})` } : undefined}
            >
              {o}
            </button>
          );
        })}
      </div>
      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
