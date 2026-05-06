import { useState } from "react";
import { ImportButton } from "./components/ImportButton";
import { Library } from "./views/Library";
import { Quiz } from "./views/Quiz";
import { Settings } from "./views/Settings";
import { useDueCount } from "./quiz/useDueCount";

type View = "library" | "quiz" | "settings";

export function App() {
  const [view, setView] = useState<View>("library");
  const dueCount = useDueCount();

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col">
      {/* Sticky top bar — always reachable on mobile, including the active mode badge. */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-xl">
              Vocabulary Builder
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Local practice. Your spreadsheet is the source of truth.
            </p>
          </div>
        </div>
        <nav
          aria-label="Sections"
          className="mt-3 flex gap-1 rounded-lg bg-slate-200/70 p-1 text-sm"
        >
          <NavButton
            current={view}
            value="library"
            label="Library"
            onSelect={setView}
          />
          <NavButton
            current={view}
            value="quiz"
            label="Quiz"
            badge={dueCount}
            onSelect={setView}
          />
          <NavButton
            current={view}
            value="settings"
            label="Settings"
            onSelect={setView}
          />
        </nav>
      </header>

      <main className="flex-1 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 sm:pt-6">
        <div className="flex flex-col gap-5">
          <ImportButton />
          {view === "library" && <Library />}
          {view === "quiz" && <Quiz />}
          {view === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}

function NavButton({
  current,
  value,
  label,
  badge,
  onSelect,
}: {
  current: View;
  value: View;
  label: string;
  badge?: number | undefined;
  onSelect: (v: View) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span
          aria-label={`${badge} due`}
          className={`rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
            active ? "bg-slate-900 text-white" : "bg-slate-300/70 text-slate-700"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
