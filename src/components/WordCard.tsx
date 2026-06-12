import { memo } from "react";
import type { Progress, Word } from "../db/schema";
import { splitTags } from "../lib/normalize";
import { isLeech } from "../quiz/sm2";
import { PersonalSentenceEditor } from "./PersonalSentenceEditor";

// Memoized: with a paged library the list can still hold dozens of cards;
// answering a quiz question or toggling one card shouldn't re-render the rest.
// `onToggle` takes the id so the parent can pass one stable callback.
export const WordCard = memo(WordCardInner);

function WordCardInner({
  word,
  progress,
  expanded,
  onToggle,
}: {
  word: Word;
  progress: Progress | undefined;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const open = expanded;
  const tags = splitTags(word.tags);
  const archived = word.archivedAt !== null;
  const leech = progress ? isLeech(progress) : false;
  const mastery = progress?.masteryLevel ?? 0;

  return (
    <li
      className={`rounded-xl border bg-white shadow-sm transition ${
        archived ? "border-slate-200 opacity-60" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(word.id)}
        className="flex w-full items-start justify-between gap-3 rounded-xl p-4 text-left transition active:bg-slate-50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="break-words text-lg font-semibold text-slate-900">
              {word.word}
            </h3>
            {word.partOfSpeech && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {word.partOfSpeech}
              </span>
            )}
            {word.pronunciation && (
              <span className="text-sm text-slate-500">
                /{word.pronunciation}/
              </span>
            )}
            {archived && <Badge tone="slate">archived</Badge>}
            {leech && !archived && (
              <Badge tone="rose" title="Repeatedly forgotten — flagged as a leech.">
                leech
              </Badge>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-700">
            {word.meaning}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <MasteryDots level={mastery} />
            {word.difficulty && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                {word.difficulty}
              </span>
            )}
            {tags.map((t) => (
              <span
                key={t}
                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <span
          aria-hidden
          className={`mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition ${
            open ? "rotate-90" : ""
          }`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M7 5l6 5-6 5V5z" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 pb-4 pt-3 text-sm">
          {word.meaning && (
            <Detail label="Meaning" value={word.meaning} prominent />
          )}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail label="Examples" value={word.examples} />
            <Detail label="Cloze sentence" value={word.clozeSentence} />
            <Detail label="Synonyms" value={word.synonyms} />
            <Detail label="Antonyms" value={word.antonyms} />
            <Detail label="Word family" value={word.wordFamily} />
            <Detail label="Roots / Etymology" value={word.roots} />
            <Detail label="Memory" value={word.memory} />
            <Detail label="Confusable with" value={word.confusableWith} />
          </dl>
          <PersonalSentenceEditor
            wordId={word.id}
            initial={progress?.personalSentence ?? null}
          />
          {progress && <ProgressMeta progress={progress} />}
        </div>
      )}
    </li>
  );
}

function Badge({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: "slate" | "rose";
  title?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-100 text-rose-800"
      : "bg-slate-200 text-slate-600";
  return (
    <span
      title={title}
      className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${toneClass}`}
    >
      {children}
    </span>
  );
}

function MasteryDots({ level }: { level: number }) {
  return (
    <span
      aria-label={`Mastery level ${level} of 5`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${
            i <= level ? "bg-emerald-500" : "bg-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

function ProgressMeta({ progress }: { progress: Progress }) {
  const seen = progress.correctCount + progress.incorrectCount;
  if (seen === 0 && progress.lapses === 0) return null;
  return (
    <div className="text-[11px] text-slate-500">
      {progress.correctCount} correct · {progress.incorrectCount} wrong
      {progress.lapses > 0 && <> · {progress.lapses} lapses</>}
      {progress.intervalDays > 0 && (
        <> · interval {progress.intervalDays}d</>
      )}
    </div>
  );
}

function Detail({
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
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd
        className={`whitespace-pre-line text-slate-800 ${
          prominent ? "text-base leading-relaxed" : "text-sm leading-relaxed"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
