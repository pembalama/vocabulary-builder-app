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
  // where the card face already shows that info.
  showHeader?: boolean;
}

// Above this length an example is "long" and goes into the collapsed extras
// instead of the fast-review block.
const SHORT_EXAMPLE_MAX = 160;

// Split the Examples field into a fast-review short example and overflow.
export function splitExample(examples: string): { short: string; long: string } {
  const first = firstSentence(examples);
  if (!first) return { short: "", long: "" };
  if (first.length <= SHORT_EXAMPLE_MAX) return { short: first, long: "" };
  return { short: "", long: first };
}

// Post-answer reinforcement, tuned for fast daily review:
//
//   Always visible: word header (optional) + meaning + one SHORT example.
//   Collapsed under "More": memory hint, long example, synonyms/antonyms,
//   word family, roots, confusables, and the personal sentence.
//
//   Exception: right after the user's first correct answer on a word with no
//   personal sentence yet, the editor opens inline (the prompt-once moment).
export function Reinforcement(props: ReinforcementProps) {
  const showHeader = props.showHeader !== false;
  const { short, long } = splitExample(props.examples);

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
        <div className={`flex flex-col gap-3 ${showHeader ? "mt-2.5" : ""}`}>
          {props.meaning && (
            <p className="whitespace-pre-line text-base font-medium leading-relaxed text-slate-900 sm:text-lg">
              {props.meaning}
            </p>
          )}
          {short && (
            <p className="whitespace-pre-line border-l-2 border-indigo-200 pl-3 text-sm italic leading-relaxed text-slate-600">
              {short}
            </p>
          )}
        </div>
      </div>
      <ReinforcementExtras
        wordId={props.wordId}
        memory={props.memory}
        synonyms={props.synonyms}
        antonyms={props.antonyms}
        wordFamily={props.wordFamily}
        roots={props.roots}
        confusableWith={props.confusableWith}
        longExample={long}
        personalSentence={props.personalSentence}
        promptForSentence={props.promptForSentence === true}
      />
    </div>
  );
}

export interface ReinforcementExtrasProps {
  wordId: string;
  memory: string;
  synonyms: string;
  antonyms: string;
  wordFamily: string;
  roots: string;
  confusableWith: string;
  longExample?: string;
  personalSentence: string | null;
  promptForSentence: boolean;
}

// The collapsed "More" accordion + the prompt-once sentence editor. Shared by
// Reinforcement (MC/Typed/Cloze) and FlashcardCard (which renders its own
// card faces and grade buttons first).
export function ReinforcementExtras(props: ReinforcementExtrasProps) {
  const longExample = props.longExample ?? "";
  const hasMore = Boolean(
    props.memory ||
      props.synonyms ||
      props.antonyms ||
      props.wordFamily ||
      props.roots ||
      props.confusableWith ||
      longExample ||
      !props.promptForSentence,
  );

  return (
    <div className="flex flex-col gap-3">
      {props.promptForSentence && (
        <PersonalSentenceEditor
          wordId={props.wordId}
          initial={props.personalSentence}
          promptOpen
        />
      )}
      {hasMore && (
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="flex min-h-touch cursor-pointer list-none items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 [&::-webkit-details-marker]:hidden">
            <Caret />
            <span>More details</span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-slate-100 p-3 text-sm">
            {longExample && <Field label="Example" value={longExample} />}
            {props.memory && (
              <div className="rounded-md bg-amber-50/80 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                  Memory hint
                </div>
                <div className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-amber-900">
                  {props.memory}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <Field
                    label="Confusable with"
                    value={props.confusableWith}
                  />
                </div>
              )}
            </div>
            {!props.promptForSentence && (
              <PersonalSentenceEditor
                wordId={props.wordId}
                initial={props.personalSentence}
              />
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
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
