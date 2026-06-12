import {
  forwardRef,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

// Small shared UI primitives. The app's accent color is indigo; neutrals are
// slate. Keep all primary-action styling here so it stays consistent.

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BASE =
  "inline-flex min-h-touch items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition active:scale-[0.98] motion-reduce:transform-none disabled:cursor-not-allowed disabled:active:scale-100";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50",
  danger:
    "border border-red-300 bg-white text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={`${BASE} ${VARIANTS[variant]} ${className ?? ""}`}
        {...rest}
      />
    );
  },
);

// Circular progress indicator (0–100). Children render centered inside.
// The arc animates from 0 to `value` on mount (one CSS transition; under
// prefers-reduced-motion it snaps instantly).
export function ProgressRing({
  value,
  size = 112,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // One frame at 0 so the stroke transition has a starting point.
    const id = requestAnimationFrame(() => setDisplay(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="img"
      aria-label={`${Math.round(clamped)}%`}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - display / 100)}
          className="stroke-indigo-500 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
