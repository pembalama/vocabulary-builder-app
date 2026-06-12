import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Progress } from "../db/schema";
import { splitTags } from "../lib/normalize";
import {
  SORT_KEYS,
  SORT_LABELS,
  sortWords,
  type SortKey,
} from "../lib/sortWords";
import { isLeech } from "../quiz/sm2";
import {
  EMPTY_FILTERS,
  FilterBar,
  type Filters,
} from "../components/FilterBar";
import { WordCard } from "../components/WordCard";
import { ImportButton } from "../components/ImportButton";
import { Button } from "../components/ui";

// Render the list in pages so a 5,000-word library doesn't mount 5,000 cards
// at once on a phone. Filters/search/sort operate on the full set; only
// rendering is capped.
const PAGE_SIZE = 60;

export function Library() {
  const words = useLiveQuery(() => db.words.toArray(), []);
  const progressList = useLiveQuery(() => db.progress.toArray(), []);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showLeechesOnly, setShowLeechesOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("word-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // Expansion state is keyed by word id so it survives filter/sort changes:
  // a word that's expanded, filtered out, then re-included stays expanded.
  // Bulk Expand-All / Collapse-All only touch currently-visible word ids.
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  // New slice of the library → start from the first page again.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sortKey, showLeechesOnly]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const progressById = useMemo<Map<string, Progress>>(
    () => new Map((progressList ?? []).map((p) => [p.wordId, p])),
    [progressList],
  );

  const { partsOfSpeech, difficulties, tags } = useMemo(() => {
    const pos = new Set<string>();
    const diff = new Set<string>();
    const tg = new Set<string>();
    for (const w of words ?? []) {
      if (w.partOfSpeech) pos.add(w.partOfSpeech);
      if (w.difficulty) diff.add(w.difficulty);
      for (const t of splitTags(w.tags)) tg.add(t);
    }
    return {
      partsOfSpeech: [...pos].sort(),
      difficulties: [...diff].sort(),
      tags: [...tg].sort(),
    };
  }, [words]);

  const leechCount = useMemo(() => {
    if (!words || !progressList) return 0;
    let n = 0;
    for (const w of words) {
      if (w.archivedAt !== null) continue;
      const p = progressById.get(w.id);
      if (p && isLeech(p)) n++;
    }
    return n;
  }, [words, progressList, progressById]);

  const filtered = useMemo(() => {
    if (!words) return [];
    const q = filters.search.trim().toLowerCase();
    return words.filter((w) => {
      if (!filters.showArchived && w.archivedAt !== null) return false;
      if (filters.partOfSpeech && w.partOfSpeech !== filters.partOfSpeech)
        return false;
      if (filters.difficulty && w.difficulty !== filters.difficulty)
        return false;
      if (filters.tag) {
        const wordTags = splitTags(w.tags).map((t) => t.toLowerCase());
        if (!wordTags.includes(filters.tag.toLowerCase())) return false;
      }
      if (q) {
        const hay = `${w.word} ${w.meaning}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (showLeechesOnly) {
        const p = progressById.get(w.id);
        if (!p || !isLeech(p)) return false;
      }
      return true;
    });
  }, [words, filters, showLeechesOnly, progressById]);

  const sorted = useMemo(
    () => sortWords(filtered, progressById, sortKey),
    [filtered, progressById, sortKey],
  );

  const pageItems = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  const expandAllVisible = useCallback(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const w of sorted) next.add(w.id);
      return next;
    });
  }, [sorted]);

  const collapseAllVisible = useCallback(() => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const w of sorted) next.delete(w.id);
      return next;
    });
  }, [sorted]);

  const visibleExpandedCount = useMemo(() => {
    let n = 0;
    for (const w of sorted) if (expandedIds.has(w.id)) n++;
    return n;
  }, [sorted, expandedIds]);

  const allVisibleExpanded =
    sorted.length > 0 && visibleExpandedCount === sorted.length;
  const anyVisibleExpanded = visibleExpandedCount > 0;

  if (words === undefined || progressList === undefined) {
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

  if (words.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-10">
        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
          No words yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Import your vocabulary file to get started. Re-imports are safe —
          your learning progress is preserved.
        </p>
        <div className="mt-5 flex justify-center">
          <ImportButton />
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        partsOfSpeech={partsOfSpeech}
        difficulties={difficulties}
        tags={tags}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-baseline justify-between gap-3 sm:flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Library</h2>
          <span className="text-sm text-slate-500 tabular-nums">
            {sorted.length} of {words.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <label className="flex min-h-touch items-center gap-2">
            <span className="text-xs font-medium text-slate-600">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="min-h-touch rounded-md border border-slate-300 bg-white px-2 text-base focus:border-slate-500 focus:outline-none sm:text-sm"
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white text-sm">
            <button
              type="button"
              onClick={expandAllVisible}
              disabled={sorted.length === 0 || allVisibleExpanded}
              aria-pressed={allVisibleExpanded}
              className="min-h-touch px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAllVisible}
              disabled={sorted.length === 0 || !anyVisibleExpanded}
              className="min-h-touch border-l border-slate-300 px-3 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              Collapse all
            </button>
          </div>
          {leechCount > 0 && (
            <label className="flex min-h-touch items-center gap-2 rounded-md border border-slate-300 bg-white px-3">
              <input
                type="checkbox"
                checked={showLeechesOnly}
                onChange={(e) => setShowLeechesOnly(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm">Leeches only ({leechCount})</span>
            </label>
          )}
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
          <p className="text-sm text-slate-600">
            No words match the current filters.
          </p>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              setShowLeechesOnly(false);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {pageItems.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                progress={progressById.get(w.id)}
                expanded={expandedIds.has(w.id)}
                onToggle={toggleExpanded}
              />
            ))}
          </ul>
          {sorted.length > visibleCount && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Show more ({sorted.length - visibleCount} remaining)
            </Button>
          )}
        </>
      )}
    </section>
  );
}
