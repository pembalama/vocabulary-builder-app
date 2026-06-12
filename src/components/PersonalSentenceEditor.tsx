import { useEffect, useRef, useState } from "react";
import { setPersonalSentence } from "../db/progress";

interface Props {
  wordId: string;
  initial: string | null;
  // When true, render the editor open by default (used after a correct answer
  // when the word still has no personal sentence — the prompt-once UX).
  promptOpen?: boolean;
}

export function PersonalSentenceEditor({ wordId, initial, promptOpen }: Props) {
  const hasInitial = (initial ?? "").trim().length > 0;
  const [editing, setEditing] = useState(!hasInitial && promptOpen === true);
  const [draft, setDraft] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const lastWordId = useRef(wordId);

  // Reset state when the editor switches to a different word.
  useEffect(() => {
    if (lastWordId.current !== wordId) {
      lastWordId.current = wordId;
      setDraft(initial ?? "");
      setEditing(((initial ?? "").trim().length === 0) && promptOpen === true);
      setSaving(false);
    }
  }, [wordId, initial, promptOpen]);

  async function save() {
    setSaving(true);
    try {
      await setPersonalSentence(wordId, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Your sentence
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex min-h-touch items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {hasInitial ? "Edit" : "Add"}
          </button>
        </div>
        {hasInitial ? (
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {initial}
          </p>
        ) : (
          <p className="mt-1 text-sm italic text-slate-400">No sentence yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white p-3">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {hasInitial
          ? "Edit your sentence"
          : "Write a sentence using this word"}
      </label>
      <textarea
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter saves; plain Enter inserts a newline so multi-line
          // sentences are easy to type.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void save();
          }
        }}
        rows={3}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-base leading-relaxed focus:border-slate-500 focus:outline-none sm:text-sm"
        placeholder="A sentence that helps you remember the word…"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-touch items-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(initial ?? "");
            setEditing(false);
          }}
          className="inline-flex min-h-touch items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {hasInitial ? "Cancel" : "Skip"}
        </button>
        <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">
          ⌘/Ctrl + Enter to save
        </span>
      </div>
    </div>
  );
}
