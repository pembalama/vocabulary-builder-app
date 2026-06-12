import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Progress } from "../db/schema";
import {
  computeStreak,
  dateKey,
  REVIEW_LOG_KEY,
  sanitizeReviewLog,
} from "../db/stats";
import { isDue } from "../quiz/pool";
import { ImportButton } from "../components/ImportButton";
import { Button } from "../components/ui";

export function Home({
  onNavigate,
}: {
  onNavigate: (view: "quiz" | "library" | "settings") => void;
}) {
  const words = useLiveQuery(() => db.words.toArray(), []);
  const progressList = useLiveQuery(() => db.progress.toArray(), []);
  // `?? null` distinguishes "still loading" (undefined) from "no log yet" (null).
  const logEntry = useLiveQuery(
    async () => (await db.meta.get(REVIEW_LOG_KEY)) ?? null,
    [],
  );

  const progressById = useMemo<Map<string, Progress>>(
    () => new Map((progressList ?? []).map((p) => [p.wordId, p])),
    [progressList],
  );

  if (words === undefined || progressList === undefined || logEntry === undefined) {
    return (
      <div
        role="status"
        aria-busy="true"
        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500"
      >
        Loading…
      </div>
    );
  }

  const active = words.filter((w) => w.archivedAt === null && w.meaning);

  if (active.length === 0) {
    return <Onboarding />;
  }

  const now = Date.now();
  const dueCount = active.filter((w) => isDue(w, progressById, now)).length;

  const log = sanitizeReviewLog(logEntry?.value);
  const streak = computeStreak(log, now);
  const today = log[dateKey(now)] ?? { total: 0, correct: 0 };

  let totalCorrect = 0;
  let totalAnswered = 0;
  const buckets = { new: 0, learning: 0, solid: 0, mastered: 0 };
  let nextDueAt: number | null = null;
  for (const w of active) {
    const p = progressById.get(w.id);
    totalCorrect += p?.correctCount ?? 0;
    totalAnswered += (p?.correctCount ?? 0) + (p?.incorrectCount ?? 0);
    const m = p?.masteryLevel ?? 0;
    if (m === 0) buckets.new++;
    else if (m <= 2) buckets.learning++;
    else if (m <= 4) buckets.solid++;
    else buckets.mastered++;
    const due = p?.nextReviewAt ?? now;
    if (due > now && (nextDueAt === null || due < nextDueAt)) nextDueAt = due;
  }
  const accuracy =
    totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  return (
    <section className="flex flex-col gap-4">
      {dueCount > 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20 sm:p-8">
          <p className="text-sm font-medium text-indigo-100">
            Ready for review
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">
            {dueCount}
            <span className="ml-2 text-lg font-medium text-indigo-200">
              word{dueCount === 1 ? "" : "s"} due
            </span>
          </p>
          <button
            type="button"
            onClick={() => onNavigate("quiz")}
            className="mt-5 inline-flex min-h-touch w-full items-center justify-center rounded-lg bg-white px-6 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 active:scale-[0.98] motion-reduce:transform-none sm:w-auto"
          >
            Start review
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <p className="text-base font-semibold text-emerald-900">
            All caught up
          </p>
          <p className="mt-1 text-sm leading-relaxed text-emerald-800">
            Nothing is due right now.
            {nextDueAt !== null && ` Next review ${formatNextDue(nextDueAt)}.`}
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => onNavigate("quiz")}
          >
            Practice anyway
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Streak"
          value={streak > 0 ? `${streak}` : "0"}
          suffix={streak === 1 ? "day" : "days"}
          highlight={streak > 0}
        />
        <StatCard
          label="Today"
          value={`${today.total}`}
          suffix={today.total === 1 ? "review" : "reviews"}
        />
        <StatCard
          label="Accuracy"
          value={accuracy !== null ? `${accuracy}%` : "—"}
          suffix="all time"
        />
        <StatCard
          label="Words"
          value={`${active.length}`}
          suffix="active"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Mastery</h3>
          <button
            type="button"
            onClick={() => onNavigate("library")}
            className="text-xs font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            Browse library →
          </button>
        </div>
        <MasteryBar buckets={buckets} total={active.length} />
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          <Legend color="bg-slate-300" label="New" count={buckets.new} />
          <Legend
            color="bg-amber-400"
            label="Learning"
            count={buckets.learning}
          />
          <Legend color="bg-indigo-400" label="Solid" count={buckets.solid} />
          <Legend
            color="bg-emerald-500"
            label="Mastered"
            count={buckets.mastered}
          />
        </dl>
      </div>
    </section>
  );
}

function Onboarding() {
  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-600/20 sm:p-8">
        <h2 className="text-2xl font-bold sm:text-3xl">Welcome</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-indigo-100">
          Build vocabulary with spaced repetition. Your spreadsheet is the
          source of truth — everything stays in your browser.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <ol className="flex flex-col gap-4">
          <Step n={1} title="Prepare your spreadsheet">
            XLSX or CSV with columns like Word, Part of Speech, Meaning,
            Examples, Tags, Difficulty.
          </Step>
          <Step n={2} title="Import it">
            Re-imports are always safe — learning progress is preserved and
            merged by word.
          </Step>
          <Step n={3} title="Review daily">
            Five quiz modes with SM-2 scheduling. A few minutes a day builds a
            streak.
          </Step>
        </ol>
        <div className="mt-5 border-t border-slate-100 pt-5">
          <ImportButton />
        </div>
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
        {n}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
          {children}
        </p>
      </div>
    </li>
  );
}

function StatCard({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: string;
  suffix: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-bold tabular-nums ${
            highlight ? "text-indigo-600" : "text-slate-900"
          }`}
        >
          {highlight ? `🔥 ${value}` : value}
        </span>
        <span className="text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );
}

function MasteryBar({
  buckets,
  total,
}: {
  buckets: { new: number; learning: number; solid: number; mastered: number };
  total: number;
}) {
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      aria-hidden
      className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div className="bg-slate-300" style={{ width: pct(buckets.new) }} />
      <div className="bg-amber-400" style={{ width: pct(buckets.learning) }} />
      <div className="bg-indigo-400" style={{ width: pct(buckets.solid) }} />
      <div
        className="bg-emerald-500"
        style={{ width: pct(buckets.mastered) }}
      />
    </div>
  );
}

function Legend({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2 w-2 rounded-full ${color}`} />
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{count}</dd>
    </div>
  );
}

function formatNextDue(ts: number): string {
  const now = new Date();
  const due = new Date(ts);
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(due) - startOf(now)) / 86_400_000);
  if (days <= 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
