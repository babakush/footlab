import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#c6f432" />
      <path d="M10 23V9h12v3.6h-7.9v2.7h6.9v3.5h-6.9V23z" fill="#0a0b0d" />
      <circle cx="22.5" cy="21.5" r="2.5" fill="#0a0b0d" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="FOOTLAB, inicio">
      <LogoMark />
      <span className="text-[15px] tracking-[0.08em]">FOOTLAB</span>
    </Link>
  );
}
