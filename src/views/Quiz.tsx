import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Progress, type Word } from "../db/schema";
import { recordAnswer } from "../db/progress";
import { buildQuestion } from "../quiz/builders";
import {
  buildQueue,
  eligibleWords,
  isEligibleForType,
  passesFilters,
} from "../quiz/pool";
import { typedAnswerMatches } from "../quiz/normalizeTyped";
import { buildHints, hintedQuality } from "../quiz/hints";
import { mcQuality, type Quality } from "../quiz/sm2";
import {
  EMPTY_QUIZ_FILTERS,
  QUIZ_TYPE_LABELS,
  type PoolMode,
  type Question,
  type QuizFilters,
  type QuizType,
} from "../quiz/types";
import { splitTags } from "../lib/normalize";
import { McCard, type McAnsweredState } from "../components/quiz/McCard";
import {
  TypedCard,
  type TypedAnsweredState,
} from "../components/quiz/TypedCard";
import {
  ClozeCard,
  type ClozeAnsweredState,
} from "../components/quiz/ClozeCard";
import {
  FlashcardCard,
  type FlashcardAnsweredState,
} from "../components/quiz/FlashcardCard";

type Phase =
  | { kind: "idle" }
  | {
      kind: "asking";
      question: Question;
      flipped: boolean;
      hintsUsed: number;
    }
  | {
      kind: "answered";
      question: Question;
      hintsUsed: number;
      mc: McAnsweredState | null;
      typed: TypedAnsweredState | null;
      cloze: ClozeAnsweredState | null;
      flashcard: FlashcardAnsweredState | null;
    }
  | { kind: "done" };

interface Stats {
  correct: number;
  total: number;
}

const QUIZ_TYPES: QuizType[] = [
  "wordToMeaning",
  "meaningToWord",
  "typed",
  "flashcard",
  "confusables",
  "cloze",
];

export function Quiz() {
  const allWords = useLiveQuery(() => db.words.toArray(), []);
  const allProgress = useLiveQuery(() => db.progress.toArray(), []);

  const pool = useMemo<Word[]>(
    () => (allWords ?? []).filter((w) => w.archivedAt === null && w.meaning),
    [allWords],
  );
  const progressById = useMemo<Map<string, Progress>>(
    () => new Map((allProgress ?? []).map((p) => [p.wordId, p])),
    [allProgress],
  );

  const [quizType, setQuizType] = useState<QuizType>("wordToMeaning");
  const [poolMode, setPoolMode] = useState<PoolMode>("due");
  const [filters, setFilters] = useState<QuizFilters>(EMPTY_QUIZ_FILTERS);

  const filterOptions = useMemo(() => {
    const pos = new Set<string>();
    const diff = new Set<string>();
    const tg = new Set<string>();
    for (const w of pool) {
      if (w.partOfSpeech) pos.add(w.partOfSpeech);
      if (w.difficulty) diff.add(w.difficulty);
      for (const t of splitTags(w.tags)) tg.add(t);
    }
    return {
      partsOfSpeech: [...pos].sort(),
      difficulties: [...diff].sort(),
      tags: [...tg].sort(),
    };
  }, [pool]);

  const dueCountForMode = useMemo(() => {
    const now = Date.now();
    return eligibleWords(pool, progressById, {
      poolMode: "due",
      filters,
      type: quizType,
      now,
    }).length;
  }, [pool, progressById, filters, quizType]);

  const totalCountForMode = useMemo(
    () =>
      pool.filter(
        (w) => isEligibleForType(quizType, w) && passesFilters(w, filters),
      ).length,
    [pool, filters, quizType],
  );

  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [queue, setQueue] = useState<Word[]>([]);
  const [cursor, setCursor] = useState(0);
  const [stats, setStats] = useState<Stats>({ correct: 0, total: 0 });

  const beginAt = useCallback(
    (q: readonly Word[], startIdx: number) => {
      let idx = startIdx;
      while (idx < q.length) {
        const target = q[idx];
        if (target) {
          const question = buildQuestion(quizType, target, { pool });
          if (question) {
            setCursor(idx);
            setPhase({
              kind: "asking",
              question,
              flipped: false,
              hintsUsed: 0,
            });
            return;
          }
        }
        idx++;
      }
      setPhase({ kind: "done" });
    },
    [pool, quizType],
  );

  const startSession = useCallback(() => {
    const q = buildQueue(pool, progressById, {
      poolMode,
      filters,
      type: quizType,
      now: Date.now(),
    });
    setQueue(q);
    setStats({ correct: 0, total: 0 });
    if (q.length === 0) {
      setPhase({ kind: "done" });
      return;
    }
    beginAt(q, 0);
  }, [pool, progressById, poolMode, filters, quizType, beginAt]);

  const advance = useCallback(() => {
    beginAt(queue, cursor + 1);
  }, [queue, cursor, beginAt]);

  const recordAndUpdateStats = useCallback(
    async (wordId: string, quality: Quality) => {
      const correct = quality >= 3;
      setStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
      }));
      await recordAnswer(wordId, quality);
    },
    [],
  );

  const useHint = useCallback(() => {
    if (phase.kind !== "asking") return;
    const k = phase.question.kind;
    if (k !== "typed" && k !== "cloze") return;
    setPhase({ ...phase, hintsUsed: phase.hintsUsed + 1 });
  }, [phase]);

  const answerMc = useCallback(
    async (selected: number) => {
      if (phase.kind !== "asking" || phase.question.kind !== "mc") return;
      const correct = selected === phase.question.correctIndex;
      setPhase({
        kind: "answered",
        question: phase.question,
        hintsUsed: phase.hintsUsed,
        mc: { selected, correct },
        typed: null,
        cloze: null,
        flashcard: null,
      });
      await recordAndUpdateStats(phase.question.wordId, mcQuality(correct));
    },
    [phase, recordAndUpdateStats],
  );

  const answerTyped = useCallback(
    async (input: string) => {
      if (phase.kind !== "asking" || phase.question.kind !== "typed") return;
      const correct = typedAnswerMatches(input, phase.question.word);
      const quality = hintedQuality(phase.hintsUsed, correct);
      setPhase({
        kind: "answered",
        question: phase.question,
        hintsUsed: phase.hintsUsed,
        mc: null,
        typed: { input, correct },
        cloze: null,
        flashcard: null,
      });
      await recordAndUpdateStats(phase.question.wordId, quality);
    },
    [phase, recordAndUpdateStats],
  );

  const answerCloze = useCallback(
    async (input: string) => {
      if (phase.kind !== "asking" || phase.question.kind !== "cloze") return;
      const correct = typedAnswerMatches(input, phase.question.matchTarget);
      const quality = hintedQuality(phase.hintsUsed, correct);
      setPhase({
        kind: "answered",
        question: phase.question,
        hintsUsed: phase.hintsUsed,
        mc: null,
        typed: null,
        cloze: { input, correct },
        flashcard: null,
      });
      await recordAndUpdateStats(phase.question.wordId, quality);
    },
    [phase, recordAndUpdateStats],
  );

  const flipFlashcard = useCallback(() => {
    if (
      phase.kind === "asking" &&
      phase.question.kind === "flashcard" &&
      !phase.flipped
    ) {
      setPhase({
        kind: "asking",
        question: phase.question,
        flipped: true,
        hintsUsed: phase.hintsUsed,
      });
    }
  }, [phase]);

  const gradeFlashcard = useCallback(
    async (quality: Quality) => {
      if (phase.kind !== "asking" || phase.question.kind !== "flashcard")
        return;
      if (!phase.flipped) return;
      setPhase({
        kind: "answered",
        question: phase.question,
        hintsUsed: phase.hintsUsed,
        mc: null,
        typed: null,
        cloze: null,
        flashcard: { quality },
      });
      await recordAndUpdateStats(phase.question.wordId, quality);
    },
    [phase, recordAndUpdateStats],
  );

  const endSession = useCallback(() => {
    setPhase({ kind: "done" });
  }, []);

  const canStart =
    poolMode === "all" ? totalCountForMode > 0 : dueCountForMode > 0;

  // Hints + personalSentence for the current question (computed once per
  // question id so ladder text stays stable across re-renders).
  const currentQuestion =
    phase.kind === "asking" || phase.kind === "answered"
      ? phase.question
      : null;

  const hints = useMemo<readonly string[]>(() => {
    if (!currentQuestion) return [];
    if (
      currentQuestion.kind !== "typed" &&
      currentQuestion.kind !== "cloze"
    ) {
      return [];
    }
    const target =
      currentQuestion.kind === "cloze"
        ? currentQuestion.matchTarget
        : currentQuestion.word;
    return buildHints({
      word: target,
      pronunciation: currentQuestion.pronunciation,
      roots: currentQuestion.roots,
    });
  }, [currentQuestion]);

  const personalSentence = currentQuestion
    ? (progressById.get(currentQuestion.wordId)?.personalSentence ?? null)
    : null;

  const promptForSentence =
    phase.kind === "answered" &&
    !personalSentence &&
    answerWasCorrect(phase);

  // Keyboard handling. Active form fields are skipped so the typed-answer
  // input still works; disabled fields (post-submit) are not treated as active.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isFormEl =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      const inField = isFormEl && !target.disabled;

      if (phase.kind === "asking") {
        const q = phase.question;
        if (q.kind === "mc") {
          if (inField) return;
          if (e.key >= "1" && e.key <= "4") {
            const idx = Number(e.key) - 1;
            if (idx < q.options.length) {
              e.preventDefault();
              void answerMc(idx);
            }
          }
        } else if (q.kind === "flashcard") {
          if (inField) return;
          if (!phase.flipped && (e.key === " " || e.key === "Enter")) {
            e.preventDefault();
            flipFlashcard();
          } else if (phase.flipped && e.key >= "1" && e.key <= "4") {
            const idx = Number(e.key) - 1;
            const grade = [1, 3, 4, 5][idx] as Quality | undefined;
            if (grade !== undefined) {
              e.preventDefault();
              void gradeFlashcard(grade);
            }
          }
        }
        // Typed/Cloze: input field handles Enter via form submit.
      } else if (phase.kind === "answered") {
        if (inField) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          advance();
        }
      } else if (e.key === "Enter" && canStart) {
        if (inField) return;
        e.preventDefault();
        startSession();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    phase,
    answerMc,
    flipFlashcard,
    gradeFlashcard,
    advance,
    startSession,
    canStart,
  ]);

  if (allWords === undefined || allProgress === undefined) {
    return <LoadingPlaceholder />;
  }
  if (pool.length === 0) {
    return (
      <EmptyState
        title="No words yet"
        body="Import a spreadsheet from the top of the page to start quizzing."
      />
    );
  }
  if (pool.length < 4) {
    return (
      <EmptyState
        title="Need at least 4 words"
        body={`Currently ${pool.length} active word${pool.length === 1 ? "" : "s"}. Add more (or unarchive some) to start a quiz session.`}
      />
    );
  }

  if (phase.kind === "idle") {
    return (
      <StartCard
        quizType={quizType}
        onQuizTypeChange={setQuizType}
        poolMode={poolMode}
        onPoolModeChange={setPoolMode}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        dueCount={dueCountForMode}
        totalCount={totalCountForMode}
        canStart={canStart}
        onStart={startSession}
      />
    );
  }
  if (phase.kind === "done") {
    return (
      <DoneCard
        stats={stats}
        quizType={quizType}
        onQuizTypeChange={setQuizType}
        poolMode={poolMode}
        onPoolModeChange={setPoolMode}
        filters={filters}
        onFiltersChange={setFilters}
        filterOptions={filterOptions}
        dueCount={dueCountForMode}
        totalCount={totalCountForMode}
        canStart={canStart}
        onAgain={startSession}
      />
    );
  }
  return (
    <SessionView
      phase={phase}
      stats={stats}
      cursor={cursor}
      queueLength={queue.length}
      hints={hints}
      personalSentence={personalSentence}
      promptForSentence={promptForSentence}
      onMcAnswer={answerMc}
      onTypedSubmit={answerTyped}
      onClozeSubmit={answerCloze}
      onUseHint={useHint}
      onFlip={flipFlashcard}
      onGrade={gradeFlashcard}
      onAdvance={advance}
      onEnd={endSession}
    />
  );
}

function answerWasCorrect(
  phase: Extract<Phase, { kind: "answered" }>,
): boolean {
  if (phase.mc) return phase.mc.correct;
  if (phase.typed) return phase.typed.correct;
  if (phase.cloze) return phase.cloze.correct;
  if (phase.flashcard) return phase.flashcard.quality >= 3;
  return false;
}

function LoadingPlaceholder() {
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

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        {body}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

function SessionView({
  phase,
  stats,
  cursor,
  queueLength,
  hints,
  personalSentence,
  promptForSentence,
  onMcAnswer,
  onTypedSubmit,
  onClozeSubmit,
  onUseHint,
  onFlip,
  onGrade,
  onAdvance,
  onEnd,
}: {
  phase: Extract<Phase, { kind: "asking" } | { kind: "answered" }>;
  stats: Stats;
  cursor: number;
  queueLength: number;
  hints: readonly string[];
  personalSentence: string | null;
  promptForSentence: boolean;
  onMcAnswer: (i: number) => void;
  onTypedSubmit: (input: string) => void;
  onClozeSubmit: (input: string) => void;
  onUseHint: () => void;
  onFlip: () => void;
  onGrade: (q: Quality) => void;
  onAdvance: () => void;
  onEnd: () => void;
}) {
  const isAnswered = phase.kind === "answered";
  const flipped =
    phase.kind === "asking"
      ? phase.flipped
      : phase.question.kind === "flashcard";
  const progressPct =
    queueLength > 0 ? Math.round(((cursor + (isAnswered ? 1 : 0)) / queueLength) * 100) : 0;
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              <span className="font-semibold text-slate-900">
                {cursor + 1}
              </span>
              <span className="text-slate-400"> / {queueLength}</span>
            </span>
            <span className="hidden sm:inline">
              <span className="font-semibold text-slate-900 tabular-nums">
                {stats.correct}
              </span>{" "}
              correct
            </span>
          </div>
          <button
            type="button"
            onClick={onEnd}
            className="inline-flex min-h-touch items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            End session
          </button>
        </div>
        <div
          aria-label={`Progress: ${progressPct}%`}
          className="h-1 w-full overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className="h-full bg-slate-900 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 sm:hidden">
          <span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {stats.correct}
            </span>{" "}
            correct
          </span>
          {stats.total > stats.correct && (
            <span className="tabular-nums">
              {stats.total - stats.correct} wrong
            </span>
          )}
        </div>
      </header>
      <div key={phase.question.wordId} className="animate-fade-up">
        {phase.question.kind === "mc" && (
          <McCard
            question={phase.question}
            answered={phase.kind === "answered" ? phase.mc : null}
            onAnswer={onMcAnswer}
            personalSentence={personalSentence}
            promptForSentence={promptForSentence}
          />
        )}
        {phase.question.kind === "typed" && (
          <TypedCard
            question={phase.question}
            answered={phase.kind === "answered" ? phase.typed : null}
            hints={hints}
            hintsUsed={phase.hintsUsed}
            onUseHint={onUseHint}
            onSubmit={onTypedSubmit}
            personalSentence={personalSentence}
            promptForSentence={promptForSentence}
          />
        )}
        {phase.question.kind === "cloze" && (
          <ClozeCard
            question={phase.question}
            answered={phase.kind === "answered" ? phase.cloze : null}
            hints={hints}
            hintsUsed={phase.hintsUsed}
            onUseHint={onUseHint}
            onSubmit={onClozeSubmit}
            personalSentence={personalSentence}
            promptForSentence={promptForSentence}
          />
        )}
        {phase.question.kind === "flashcard" && (
          <FlashcardCard
            question={phase.question}
            flipped={flipped}
            answered={phase.kind === "answered" ? phase.flashcard : null}
            onFlip={onFlip}
            onGrade={onGrade}
            personalSentence={personalSentence}
            promptForSentence={promptForSentence}
          />
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-xs text-slate-400 sm:block">
          {keyboardHint(phase, isAnswered)}
        </p>
        {isAnswered && (
          <button
            type="button"
            onClick={onAdvance}
            autoFocus
            className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 active:bg-slate-800 sm:w-auto"
          >
            Next →
          </button>
        )}
      </div>
    </section>
  );
}

function keyboardHint(
  phase: Extract<Phase, { kind: "asking" } | { kind: "answered" }>,
  isAnswered: boolean,
): string {
  if (isAnswered) return "Press Enter or Space for the next question.";
  switch (phase.question.kind) {
    case "mc":
      return "Press 1–4 to answer.";
    case "typed":
      return "Press Enter to submit.";
    case "cloze":
      return "Press Enter to submit.";
    case "flashcard":
      return phase.kind === "asking" && phase.flipped
        ? "Press 1–4 to grade (Again / Hard / Good / Easy)."
        : "Press Space to flip.";
  }
}

interface StartProps {
  quizType: QuizType;
  onQuizTypeChange: (t: QuizType) => void;
  poolMode: PoolMode;
  onPoolModeChange: (m: PoolMode) => void;
  filters: QuizFilters;
  onFiltersChange: (f: QuizFilters) => void;
  filterOptions: {
    partsOfSpeech: string[];
    difficulties: string[];
    tags: string[];
  };
  dueCount: number;
  totalCount: number;
  canStart: boolean;
}

function StartCard(props: StartProps & { onStart: () => void }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
          New session
        </h3>
        <p className="text-sm text-slate-500">
          Pick a mode and pool, then start.
        </p>
      </div>
      <Configurator {...props} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CountSummary
          poolMode={props.poolMode}
          dueCount={props.dueCount}
          totalCount={props.totalCount}
        />
        <button
          type="button"
          onClick={props.onStart}
          disabled={!props.canStart}
          className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 active:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          Start session
        </button>
      </div>
      {!props.canStart && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {props.poolMode === "due"
            ? "Nothing due in this slice. Switch to Practice all or relax the filters."
            : "No words match the current selection."}
        </p>
      )}
    </div>
  );
}

function DoneCard(props: StartProps & { onAgain: () => void; stats: Stats }) {
  const pct =
    props.stats.total === 0
      ? 0
      : Math.round((props.stats.correct / props.stats.total) * 100);
  return (
    <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 sm:text-xl">
          Session complete
        </h3>
        {props.stats.total > 0 ? (
          <>
            <div className="mt-2 text-4xl font-semibold tabular-nums text-slate-900 sm:text-5xl">
              {props.stats.correct}
              <span className="text-slate-400"> / {props.stats.total}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">{pct}% correct</div>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-500">No questions answered.</p>
        )}
      </div>
      <Configurator {...props} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CountSummary
          poolMode={props.poolMode}
          dueCount={props.dueCount}
          totalCount={props.totalCount}
        />
        <button
          type="button"
          onClick={props.onAgain}
          disabled={!props.canStart}
          className="inline-flex min-h-touch w-full items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 active:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
        >
          Start another
        </button>
      </div>
    </div>
  );
}

function Configurator(props: StartProps) {
  const filtersDirty =
    Boolean(props.filters.partOfSpeech) ||
    Boolean(props.filters.difficulty) ||
    Boolean(props.filters.tag);
  return (
    <div className="flex flex-col gap-4">
      <FieldSet label="Mode">
        <div className="flex flex-wrap gap-1.5">
          {QUIZ_TYPES.map((t) => (
            <ModeChip
              key={t}
              active={props.quizType === t}
              onClick={() => props.onQuizTypeChange(t)}
              label={QUIZ_TYPE_LABELS[t]}
            />
          ))}
        </div>
      </FieldSet>
      <FieldSet label="Pool">
        <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 text-sm">
          <PoolPill
            active={props.poolMode === "due"}
            onClick={() => props.onPoolModeChange("due")}
            label="Due now"
            count={props.dueCount}
          />
          <PoolPill
            active={props.poolMode === "all"}
            onClick={() => props.onPoolModeChange("all")}
            label="Practice all"
            count={props.totalCount}
          />
        </div>
      </FieldSet>
      <FieldSet label="Filters">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FilterSelect
            label="Part of speech"
            value={props.filters.partOfSpeech}
            options={props.filterOptions.partsOfSpeech}
            onChange={(v) =>
              props.onFiltersChange({ ...props.filters, partOfSpeech: v })
            }
          />
          <FilterSelect
            label="Difficulty"
            value={props.filters.difficulty}
            options={props.filterOptions.difficulties}
            onChange={(v) =>
              props.onFiltersChange({ ...props.filters, difficulty: v })
            }
          />
          <FilterSelect
            label="Tag"
            value={props.filters.tag}
            options={props.filterOptions.tags}
            onChange={(v) =>
              props.onFiltersChange({ ...props.filters, tag: v })
            }
          />
        </div>
        {filtersDirty && (
          <button
            type="button"
            onClick={() => props.onFiltersChange(EMPTY_QUIZ_FILTERS)}
            className="mt-2 inline-flex min-h-touch items-center self-start rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </FieldSet>
    </div>
  );
}

function CountSummary({
  poolMode,
  dueCount,
  totalCount,
}: {
  poolMode: PoolMode;
  dueCount: number;
  totalCount: number;
}) {
  return (
    <p className="text-sm text-slate-500">
      {poolMode === "due"
        ? `${dueCount} due now`
        : `${totalCount} word${totalCount === 1 ? "" : "s"} in pool`}
    </p>
  );
}

function FieldSet({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-touch items-center rounded-full border px-3.5 text-sm font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function PoolPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-touch items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${
            active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-touch w-full rounded-md border border-slate-300 bg-white px-2 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
