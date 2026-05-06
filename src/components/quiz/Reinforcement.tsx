import { PersonalSentenceEditor } from "../PersonalSentenceEditor";

export interface ReinforcementProps {
  wordId: string;
  word: string;
  partOfSpeech: string;
  pronunciation: string;
  meaning: string;
  examples: string;
  synonyms: string;
  antonyms: string;
  wordFamily: string;
  roots: string;
  memory: string;
  confusableWith: string;
  personalSentence: string | null;
  // When true, opens the personal-sentence editor automatically (used after a
  // correct answer when the word still has no sentence — the prompt-once UX).
  promptForSentence?: boolean;
  // When false, omits the word/POS/pronunciation header. Useful for Flashcard
  // where the front already shows that info above the back.
  showHeader?: boolean;
}

// Shared post-answer reinforcement panel for ALL quiz modes (MC, Typed, Cloze,
// Flashcard). Visual hierarchy:
//
//   1. Word + POS + pronunciation (header — optional)
//   2. Meaning (the core fact, large and prominent)
//   3. Example (concrete usage)
//   4. Memory hint (mnemonic — important for retention)
//   5. <details> "More" → secondary metadata: synonyms, antonyms, word family,
//                         roots, confusable with
//   6. Personal sentence editor
export function Reinforcement(props: ReinforcementProps) {
  const showHeader = props.showHeader !== false;
  const example = firstSentence(props.examples);
  const hasSecondary = Boolean(
    props.synonyms ||
      props.antonyms ||
      props.wordFamily ||
      props.roots ||
      props.confusableWith,
  );

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        {showHeader && (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xl font-semibold text-slate-900 sm:text-2xl">
              {props.word}
            </span>
            {props.partOfSpeech && (
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                {props.partOfSpeech}
              </span>
            )}
            {props.pronunciation && (
              <span className="text-sm text-slate-500">
                /{props.pronunciation}/
              </span>
            )}
          </div>
        )}

        {/* Primary block — always visible. */}
        <div className="mt-2 flex flex-col gap-3">
          {props.meaning && (
            <Field label="Meaning" value={props.meaning} prominent />
          )}
          {example && <Field label="Example" value={example} />}
          {props.memory && <Field label="Memory" value={props.memory} />}
        </div>

        {/* Secondary block — collapsed by default. */}
        {hasSecondary && (
          <details className="group mt-3 border-t border-slate-200 pt-3">
            <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700">
              <Caret />
              <span>More details</span>
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {props.synonyms && (
                <Field label="Synonyms" value={props.synonyms} />
              )}
              {props.antonyms && (
                <Field label="Antonyms" value={props.antonyms} />
              )}
              {props.wordFamily && (
                <Field label="Word family" value={props.wordFamily} />
              )}
              {props.roots && (
                <Field label="Roots / Etymology" value={props.roots} />
              )}
              {props.confusableWith && (
                <div className="sm:col-span-2">
                  <Field label="Confusable with" value={props.confusableWith} />
                </div>
              )}
            </div>
          </details>
        )}
      </div>

      <PersonalSentenceEditor
        wordId={props.wordId}
        initial={props.personalSentence}
        promptOpen={props.promptForSentence === true}
      />
    </div>
  );
}

function Field({
  label,
  value,
  prominent,
}: {
  label: string;
  value: string;
  prominent?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`whitespace-pre-line text-slate-800 ${
          prominent ? "text-base leading-relaxed" : "text-sm leading-relaxed"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Caret() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4 transition-transform group-open:rotate-90"
      fill="currentColor"
    >
      <path d="M7 5l6 5-6 5V5z" />
    </svg>
  );
}

function firstSentence(s: string): string {
  for (const line of (s ?? "").split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}
