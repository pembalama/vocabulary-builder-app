import { useState, type ReactNode } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Home } from "./views/Home";
import { Library } from "./views/Library";
import { Quiz } from "./views/Quiz";
import { Settings } from "./views/Settings";
import { useDueCount } from "./quiz/useDueCount";

type View = "home" | "quiz" | "library" | "settings";

export function App() {
  const [view, setView] = useState<View>("home");
  const dueCount = useDueCount();

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col">
      {/* Slim sticky top bar. On phones navigation lives in the bottom tab
          bar (thumb reach); on larger screens it's the segmented control here. */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                Vocab<span className="text-indigo-600">Builder</span>
              </h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                Local practice. Your spreadsheet is the source of truth.
              </p>
            </div>
          </div>
        </div>
        <nav
          aria-label="Sections"
          className="mt-3 hidden gap-1 rounded-lg bg-slate-200/70 p-1 text-sm sm:flex"
        >
          <NavButton current={view} value="home" label="Home" onSelect={setView} />
          <NavButton
            current={view}
            value="quiz"
            label="Quiz"
            badge={dueCount}
            onSelect={setView}
          />
          <NavButton
            current={view}
            value="library"
            label="Library"
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

      <main className="flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:pb-8 sm:pt-6">
        <ErrorBoundary>
          {view === "home" && <Home onNavigate={setView} />}
          {view === "quiz" && <Quiz />}
          {view === "library" && <Library />}
          {view === "settings" && <Settings />}
        </ErrorBoundary>
      </main>

      {/* Bottom tab bar — mobile only, inside thumb reach, safe-area aware. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:hidden"
      >
        <div className="mx-auto flex max-w-4xl items-stretch px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
          <TabButton
            current={view}
            value="home"
            label="Home"
            icon={<IconHome />}
            onSelect={setView}
          />
          <TabButton
            current={view}
            value="quiz"
            label="Quiz"
            icon={<IconBolt />}
            badge={dueCount}
            onSelect={setView}
          />
          <TabButton
            current={view}
            value="library"
            label="Library"
            icon={<IconBook />}
            onSelect={setView}
          />
          <TabButton
            current={view}
            value="settings"
            label="Settings"
            icon={<IconSliders />}
            onSelect={setView}
          />
        </div>
      </nav>
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
            active ? "bg-indigo-600 text-white" : "bg-slate-300/70 text-slate-700"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function TabButton({
  current,
  value,
  label,
  icon,
  badge,
  onSelect,
}: {
  current: View;
  value: View;
  label: string;
  icon: ReactNode;
  badge?: number | undefined;
  onSelect: (v: View) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-touch min-w-touch flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 transition ${
        active ? "text-indigo-600" : "text-slate-500 active:text-slate-700"
      }`}
    >
      <span className="relative">
        {icon}
        {typeof badge === "number" && badge > 0 && (
          <span
            aria-label={`${badge} due`}
            className="absolute -right-3.5 -top-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
    </button>
  );
}

// Brand mark: gradient squircle + white V-as-checkmark + amber spark.
// Inline SVG (no asset) so it scales crisply, ships with the bundle, and the
// same shape can later become the home-screen icon.
function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden>
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#brand-grad)" />
      <path
        d="M9.5 10 16 23l6.5-13"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25" cy="8" r="2" fill="#fbbf24" />
    </svg>
  );
}

function TabIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconHome() {
  return (
    <TabIcon>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 8.7V20a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1V8.7" />
    </TabIcon>
  );
}

function IconBolt() {
  return (
    <TabIcon>
      <path d="M13 2 4.5 13.5h6L9.5 22 19 10.5h-6L13 2z" />
    </TabIcon>
  );
}

function IconBook() {
  return (
    <TabIcon>
      <path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z" />
      <path d="M12 6.5v14" />
    </TabIcon>
  );
}

function IconSliders() {
  return (
    <TabIcon>
      <path d="M4 7h9" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M20 12h-9" />
      <circle cx="7" cy="12" r="2.5" />
      <path d="M4 17h9" />
      <circle cx="17" cy="17" r="2.5" />
    </TabIcon>
  );
}
