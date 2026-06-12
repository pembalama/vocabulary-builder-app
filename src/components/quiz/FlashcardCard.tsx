import { FLASHCARD_GRADES, type Quality } from "../../quiz/sm2";
import type { FlashcardQuestion } from "../../quiz/types";
import { ReinforcementExtras, splitExample } from "./Reinforcement";

export interface FlashcardAnsweredState {
  quality: Quality;
}

// Anki-convention grade colors: Again=rose, Hard=amber, Good=indigo,
// Easy=emerald. Color coding lets you grade by muscle memory.
const GRADE_STYLES: Record<number, { idle: string; selected: string }> = {
  1: {
    idle: "border-rose-200 bg-rose-50/60 text-rose-900 hover:border-rose-300 active:bg-rose-100",
    selected: "border-rose-600 bg-rose-600 text-white",
  },
  3: {
    idle: "border-amber-200 bg-amber-50/60 text-amber-900 hover:border-amber-300 active:bg-amber-100",
    selected: "border-amber-500 bg-amber-500 text-white",
  },
  4: {
    idle: "border-indigo-200 bg-indigo-50/60 text-indigo-900 hover:border-indigo-300 active:bg-indigo-100",
    selected: "border-indigo-600 bg-indigo-600 text-white",
  },
  5: {
    idle: "border-emerald-200 bg-emerald-50/60 text-emerald-900 hover:border-emerald-300 active:bg-emerald-100",
    selected: "border-emerald-600 bg-emerald-600 text-white",
  },
};

// A real two-faced card: front (word) and back (meaning) are stacked in the
// same grid cell and the wrapper rotates 180° as one object. Grades and the
// collapsed extras live BELOW the card so they're immediately reachable after
// the flip without scrolling past metadata.
export function FlashcardCard({
  question,
  flipped,
  answered,
  onFlip,
  onGrade,
  personalSentence,
  promptForSentence,
}: {
  question: FlashcardQuestion;
  flipped: boolean;
  answered: FlashcardAnsweredState | null;
  onFlip: () => void;
  onGrade: (q: Quality) => void;
  personalSentence: string | null;
  promptForSentence: boolean;
}) {
  const { short, long } = splitExample(question.examples);

  return (
    <div className="flex flex-col gap-3">
      <div className="flip-scene">
        <div className={`flip-card ${flipped ? "is-flipped" : ""}`}>
          {/* Front face */}
          <button
            type="button"
            onClick={onFlip}
            disabled={flipped}
            aria-hidden={flipped}
            tabIndex={flipped ? -1 : 0}
            aria-label="Tap to flip"
            className="flip-face flex min-h-[16rem] w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition active:scale-[0.99] motion-reduce:transform-none"
          >
            {question.partOfSpeech && (
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {question.partOfSpeech}
              </div>
            )}
            <div className="mt-1 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">
              {question.word}
            </div>
            {question.pronunciation && (
              <div className="mt-1 text-sm text-slate-500">
                /{question.pronunciation}/
              </div>
            )}
            <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              Tap or press Space to flip
            </div>
          </button>

          {/* Back face */}
          <div
            aria-hidden={!flipped}
            className="flip-face flip-face-back flex min-h-[16rem] w-full flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white p-6 text-center shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-center gap-x-2">
              <span className="text-base font-semibold text-slate-900">
                {question.word}
              </span>
              {question.pronunciation && (
                <span className="text-xs text-slate-500">
                  /{question.pronunciation}/
                </span>
              )}
            </div>
            <p className="mt-3 whitespace-pre-line text-lg font-medium leading-relaxed text-slate-900">
              {question.meaning}
            </p>
            {short && (
              <p className="mt-3 max-w-md whitespace-pre-line text-sm italic leading-relaxed text-slate-600">
                {short}
              </p>
            )}
          </div>
        </div>
      </div>

      {flipped && (
        <>
          <div
            className="animate-fade-up grid grid-cols-2 gap-2 sm:grid-cols-4"
            style={{ animationDelay: "180ms" }}
          >
            {FLASHCARD_GRADES.map((g, i) => {
              const styles = GRADE_STYLES[g.quality] ?? GRADE_STYLES[4]!;
              const selected = answered?.quality === g.quality;
              return (
                <button
                  type="button"
                  key={g.quality}
                  onClick={() => onGrade(g.quality)}
                  disabled={answered !== null}
                  aria-label={`${g.label} — ${g.description}`}
                  className={`flex min-h-touch flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm transition active:scale-[0.98] motion-reduce:transform-none disabled:opacity-60 ${
                    selected
                      ? `animate-correct-pop ${styles.selected}`
                      : styles.idle
                  }`}
                >
                  <span className="font-semibold">
                    <span className="hidden sm:inline">{i + 1}. </span>
                    {g.label}
                  </span>
                  <span className="text-[11px] opacity-75">
                    {g.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
            <ReinforcementExtras
              wordId={question.wordId}
              memory={question.memory}
              synonyms={question.synonyms}
              antonyms={question.antonyms}
              wordFamily={question.wordFamily}
              roots={question.roots}
              confusableWith={question.confusableWith}
              longExample={long}
              personalSentence={personalSentence}
              promptForSentence={promptForSentence}
            />
          </div>
        </>
      )}
    </div>
  );
}
