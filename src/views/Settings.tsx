import { useState } from "react";
import { db } from "../db/schema";

export function Settings() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resetProgress() {
    const ok = window.confirm(
      "Reset all learning progress?\n\n" +
        "This clears review history, intervals, and mastery levels for every word. " +
        "Your imported vocabulary and any personal sentences you've written are kept.\n\n" +
        "Words will be due again immediately.",
    );
    if (!ok) return;

    setBusy(true);
    setMessage(null);
    try {
      const now = Date.now();
      await db.transaction("rw", db.progress, async () => {
        const all = await db.progress.toArray();
        for (const p of all) {
          await db.progress.update(p.wordId, {
            correctCount: 0,
            incorrectCount: 0,
            lastReviewedAt: null,
            nextReviewAt: now,
            easeFactor: 2.5,
            intervalDays: 0,
            repetitions: 0,
            masteryLevel: 0,
            lapses: 0,
          });
        }
      });
      setMessage("Progress cleared. All words are due again.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-medium text-slate-900">
          Learning progress
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Clears all review history (correct/incorrect counts, intervals, ease
          factors, mastery levels, lapses). Imported vocabulary and personal
          sentences are kept untouched.
        </p>
        <button
          type="button"
          onClick={resetProgress}
          disabled={busy}
          className="mt-4 inline-flex min-h-touch items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Resetting…" : "Reset progress"}
        </button>
        {message && (
          <p
            role="status"
            className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          >
            {message}
          </p>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-base font-medium text-slate-900">About</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          This app runs entirely in your browser. Vocabulary lives in your
          spreadsheet; learning progress lives in IndexedDB on this device.
          Nothing leaves the browser.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          On iOS Safari, tap the Share button → <em>Add to Home Screen</em> to
          install as an app.
        </p>
      </div>
    </section>
  );
}
