import type { McQuestion } from "../../quiz/types";
import { Reinforcement } from "./Reinforcement";

export interface McAnsweredState {
  selected: number;
  correct: boolean;
}

export function McCard({
  question,
  answered,
  onAnswer,
  personalSentence,
  promptForSentence,
}: {
  question: McQuestion;
  answered: McAnsweredState | null;
  onAnswer: (i: number) => void;
  personalSentence: string | null;
  promptForSentence: boolean;
}) {
  const isAnswered = answered !== null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Prompt question={question} />
      <ol className="mt-6 flex flex-col gap-2.5">
        {question.options.map((opt, i) => (
          <li key={i}>
            <OptionButton
              index={i}
              option={opt}
              question={question}
              answered={answered}
              onAnswer={onAnswer}
            />
          </li>
        ))}
      </ol>
      {isAnswered && (
        <>
          <div
            role="status"
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              answered.correct
                ? "bg-emerald-50 text-emerald-900"
                : "bg-red-50 text-red-900"
            }`}
          >
            {answered.correct ? (
              "Correct!"
            ) : (
              <>
                Not quite. The answer was option{" "}
                <strong>{question.correctIndex + 1}</strong>:{" "}
                <span>{question.options[question.correctIndex]}</span>
              </>
            )}
          </div>
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

function Prompt({ question }: { question: McQuestion }) {
  if (question.promptKind === "word") {
    return (
      <div className="text-center">
        {question.partOfSpeech && (
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {question.partOfSpeech}
          </div>
        )}
        <div className="mt-1 break-words text-3xl font-semibold text-slate-900 sm:text-4xl">
          {question.promptText}
        </div>
        {question.pronunciation && (
          <div className="mt-1 text-sm text-slate-500">
            /{question.pronunciation}/
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {question.type === "confusables"
          ? "Choose the matching word"
          : "Which word matches this meaning?"}
      </div>
      <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-slate-900 sm:text-lg">
        {question.promptText}
      </p>
    </div>
  );
}

function OptionButton({
  index,
  option,
  question,
  answered,
  onAnswer,
}: {
  index: number;
  option: string;
  question: McQuestion;
  answered: McAnsweredState | null;
  onAnswer: (i: number) => void;
}) {
  const isAnswered = answered !== null;
  const isSelected = isAnswered && answered.selected === index;
  const isCorrect = isAnswered && index === question.correctIndex;
  const showCorrect = isAnswered && isCorrect;
  const showWrong = isAnswered && isSelected && !isCorrect;

  const classes = [
    "flex w-full min-h-touch items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-base sm:text-sm transition active:scale-[0.99]",
  ];
  if (!isAnswered) {
    classes.push(
      "border-slate-300 bg-white hover:border-slate-500 hover:bg-slate-50",
    );
  } else if (showCorrect) {
    classes.push("border-emerald-500 bg-emerald-50 text-emerald-900");
  } else if (showWrong) {
    classes.push("border-red-500 bg-red-50 text-red-900");
  } else {
    classes.push("border-slate-200 bg-slate-50 text-slate-500");
  }

  return (
    <button
      type="button"
      onClick={() => !isAnswered && onAnswer(index)}
      disabled={isAnswered}
      className={classes.join(" ")}
    >
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-current text-xs font-semibold tabular-nums">
        {index + 1}
      </span>
      <span className="flex-1 whitespace-pre-line leading-relaxed">
        {option}
      </span>
    </button>
  );
}
