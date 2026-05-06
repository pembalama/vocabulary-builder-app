interface HintsProps {
  hints: readonly string[];
  hintsUsed: number;
  onUseHint: () => void;
  disabled?: boolean;
}

export function Hints({ hints, hintsUsed, onUseHint, disabled }: HintsProps) {
  if (hints.length === 0) return null;
  const visible = hints.slice(0, hintsUsed);
  const hasMore = hintsUsed < hints.length;

  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((h, i) => (
        <div
          key={i}
          className="flex items-baseline gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
            Hint {i + 1}
          </span>
          <span className="break-all font-mono">{h}</span>
        </div>
      ))}
      {hasMore && !disabled && (
        <button
          type="button"
          onClick={onUseHint}
          className="inline-flex min-h-touch items-center self-start rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {hintsUsed === 0 ? "Show hint" : "Show another hint"}
        </button>
      )}
    </div>
  );
}
