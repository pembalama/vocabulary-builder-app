import { FLASHCARD_GRADES, type Quality } from "../../quiz/sm2";
import type { FlashcardQuestion } from "../../quiz/types";
import { Reinforcement } from "./Reinforcement";

export interface FlashcardAnsweredState {
  quality: Quality;
}

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
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <button
        type="button"
        onClick={onFlip}
        disabled={flipped}
        aria-label={flipped ? "Card flipped" : "Tap to flip"}
        className="block w-full rounded-lg py-4 text-center transition active:bg-slate-50 disabled:active:bg-transparent"
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
        {!flipped && (
          <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            Tap or press Space to flip
          </div>
        )}
      </button>
      {flipped && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <Reinforcement
            wordId={question.wordId}
            word={question.word}
            partOfSpeech={question.partOfSpeech}
            pronunciation={question.pronunciation}
            meaning={question.meaning}
            examples={question.examples}
            synonyms={question.synonyms}
            antonyms={question.antonyms}
            wordFamily={question.wordFamily}
            roots={question.roots}
            memory={question.memory}
            confusableWith={question.confusableWith}
            personalSentence={personalSentence}
            promptForSentence={promptForSentence}
            showHeader={false}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLASHCARD_GRADES.map((g, i) => (
              <button
                type="button"
                key={g.quality}
                onClick={() => onGrade(g.quality)}
                disabled={answered !== null}
                aria-label={`${g.label} — ${g.description}`}
                className={`flex min-h-touch flex-col items-center justify-center rounded-lg border px-3 py-2 text-sm transition active:scale-[0.98] disabled:opacity-50 ${
                  answered?.quality === g.quality
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-500 hover:bg-slate-50"
                }`}
              >
                <span className="font-medium">
                  <span className="hidden sm:inline">{i + 1}. </span>
                  {g.label}
                </span>
                <span className="text-[11px] opacity-70">{g.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
