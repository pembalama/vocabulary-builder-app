import type { CSSProperties } from "react";

// Compact result medallions that sit ON the answer itself (option tile or
// input field) instead of a separate banner. Correct gets the full reward:
// pop-in + particle burst + ring + self-drawing check. Wrong is a static,
// quieter ✕ — the asymmetry is deliberate.

const PARTICLES: { dx: string; dy: string; color: string }[] = [
  { dx: "-20px", dy: "-16px", color: "bg-emerald-400" },
  { dx: "20px", dy: "-12px", color: "bg-amber-400" },
  { dx: "-24px", dy: "8px", color: "bg-indigo-400" },
  { dx: "26px", dy: "12px", color: "bg-emerald-500" },
  { dx: "-8px", dy: "-26px", color: "bg-violet-400" },
  { dx: "12px", dy: "24px", color: "bg-emerald-300" },
];

export function SuccessMark() {
  return (
    <span aria-hidden className="relative inline-flex h-6 w-6 shrink-0">
      <span className="burst-ring absolute inset-0 rounded-full border-2 border-emerald-400" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className={`burst-particle absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full ${p.color}`}
          style={{ "--dx": p.dx, "--dy": p.dy } as CSSProperties}
        />
      ))}
      <span className="animate-pop-in relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
          <path
            d="M5 10.5l3.5 3.5L15 7"
            className="check-draw"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

export function FailMark() {
  return (
    <span
      aria-hidden
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
        <path
          d="M6 6l8 8M14 6l-8 8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
