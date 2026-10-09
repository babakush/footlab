"use client";
import { WEEKDAYS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DayPickerProps {
  name: string;
  value: number[];
  onChange: (days: number[]) => void;
  disabledDays?: number[];
  single?: boolean;
  label: string;
}

/** Selector de días de la semana (L-D) accesible y cómodo en móvil. */
export function DayPicker({ name, value, onChange, disabledDays = [], single, label }: DayPickerProps) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((d) => {
        const active = value.includes(d.value);
        const disabled = disabledDays.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={active}
            aria-label={d.label}
            disabled={disabled}
            onClick={() => {
              if (single) onChange(active ? [] : [d.value]);
              else onChange(active ? value.filter((v) => v !== d.value) : [...value, d.value].sort());
            }}
            className={cn(
              "flex h-12 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background/50 text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-30",
            )}
          >
            {d.short}
          </button>
        );
      })}
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
