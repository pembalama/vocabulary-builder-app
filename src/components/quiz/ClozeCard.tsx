import { useEffect, useRef, useState } from "react";
import type { ClozeQuestion } from "../../quiz/types";
import { FailMark, SuccessMark } from "./SuccessMark";
import { Hints } from "./Hints";
import { Reinforcement } from "./Reinforcement";

export interface ClozeAnsweredState {
  input: string;
  correct: boolean;
}

export function ClozeCard({
  question,
  answered,
  hints,
  hintsUsed,
  onUseHint,
  onSubmit,
  personalSentence,
  promptForSentence,
}: {
  question: ClozeQuestion;
  answered: ClozeAnsweredState | null;
  hints: readonly string[];
  hintsUsed: number;
  onUseHint: () => void;
  onSubmit: (input: string) => void;
  personalSentence: string | null;
  promptForSentence: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue("");
    inputRef.current?.focus();
  }, [question.wordId]);

  const isAnswered = answered !== null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        {question.partOfSpeech && (
          <div className="text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {question.partOfSpeech}
          </div>
        )}
        <div className="mt-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Fill in the blank
        </div>
        <p className="mt-3 whitespace-pre-line text-center text-base leading-relaxed text-slate-900 sm:text-lg">
          {isAnswered ? (
            <ClozeWithAnswer
              prompt={question.prompt}
              blank={question.blank}
              answer={question.matchTarget}
              correct={answered.correct}
            />
          ) : (
            question.prompt
          )}
        </p>
      </div>
      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isAnswered && value.trim()) onSubmit(value);
        }}
      >
        <div
          className={`relative flex-1 ${
            isAnswered && !answered.correct ? "animate-shake" : ""
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={isAnswered ? answered.input : value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isAnswered}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            enterKeyHint="done"
            placeholder="missing word"
            className={`min-h-touch w-full rounded-md border bg-white px-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isAnswered ? "pr-11" : ""
            } ${
              isAnswered
                ? answered.correct
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                  : "border-red-400 bg-red-50 text-red-900"
                : "border-slate-300"
            }`}
          />
          {isAnswered && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {answered.correct ? <SuccessMark /> : <FailMark />}
            </span>
          )}
        </div>
        {!isAnswered && (
          <button
            type="submit"
            disabled={!value.trim()}
            className="inline-flex min-h-touch items-center justify-center rounded-md bg-indigo-600 px-5 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Submit
          </button>
        )}
      </form>
      <div className="mt-3">
        <Hints
          hints={hints}
          hintsUsed={hintsUsed}
          onUseHint={onUseHint}
          disabled={isAnswered}
        />
      </div>
      {isAnswered && (
        <>
          <p role="status" className="sr-only">
            {answered.correct
              ? `Correct. The missing word is ${question.matchTarget}.`
              : `Incorrect. The missing word is ${question.matchTarget}.`}
          </p>
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
          />
        </>
      )}
    </div>
  );
}

function ClozeWithAnswer({
  prompt,
  blank,
  answer,
  correct,
}: {
  prompt: string;
  blank: string;
  answer: string;
  correct: boolean;
}) {
  const idx = prompt.indexOf(blank);
  if (idx === -1) return <>{prompt}</>;
  return (
    <>
      {prompt.slice(0, idx)}
      <span
        className={
          correct
            ? "rounded bg-emerald-100 px-1 font-medium text-emerald-900"
            : "rounded bg-red-100 px-1 font-medium text-red-900 line-through"
        }
      >
        {answer}
      </span>
      {prompt.slice(idx + blank.length)}
    </>
  );
}
