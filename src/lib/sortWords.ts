import type { Progress, Word } from "../db/schema";

export type SortKey =
  | "word-asc"
  | "word-desc"
  | "difficulty"
  | "pos"
  | "mastery-asc"
  | "mastery-desc"
  | "due"
  | "incorrect"
  | "least-recent";

export const SORT_LABELS: Record<SortKey, string> = {
  "word-asc": "Word A → Z",
  "word-desc": "Word Z → A",
  difficulty: "Difficulty",
  pos: "Part of speech",
  "mastery-asc": "Mastery low → high",
  "mastery-desc": "Mastery high → low",
  due: "Due soon",
  incorrect: "Most incorrect",
  "least-recent": "Least recently reviewed",
};

export const SORT_KEYS: SortKey[] = [
  "word-asc",
  "word-desc",
  "difficulty",
  "pos",
  "mastery-asc",
  "mastery-desc",
  "due",
  "incorrect",
  "least-recent",
];

const COLLATOR = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

const masteryOf = (p?: Progress) => p?.masteryLevel ?? 0;
const incorrectOf = (p?: Progress) => p?.incorrectCount ?? 0;
// Words with no progress row haven't been reviewed → treat as "infinitely
// long ago" (oldest), so they bubble to the top of "least-recent".
const lastReviewedOf = (p?: Progress) => p?.lastReviewedAt ?? 0;
// Same idea for due-soon: a missing progress row means immediately due.
const nextReviewOf = (p?: Progress) => p?.nextReviewAt ?? 0;

function primaryCompare(
  a: Word,
  ap: Progress | undefined,
  b: Word,
  bp: Progress | undefined,
  key: SortKey,
): number {
  switch (key) {
    case "word-asc":
      return COLLATOR.compare(a.word, b.word);
    case "word-desc":
      return COLLATOR.compare(b.word, a.word);
    case "difficulty":
      return COLLATOR.compare(a.difficulty, b.difficulty);
    case "pos":
      return COLLATOR.compare(a.partOfSpeech, b.partOfSpeech);
    case "mastery-asc":
      return masteryOf(ap) - masteryOf(bp);
    case "mastery-desc":
      return masteryOf(bp) - masteryOf(ap);
    case "due":
      return nextReviewOf(ap) - nextReviewOf(bp);
    case "incorrect":
      return incorrectOf(bp) - incorrectOf(ap);
    case "least-recent":
      return lastReviewedOf(ap) - lastReviewedOf(bp);
  }
}

// Pure sort: returns a new array, never mutates the input. Ties break on
// word A→Z so ordering stays predictable across re-renders.
export function sortWords(
  words: readonly Word[],
  progressById: ReadonlyMap<string, Progress>,
  key: SortKey,
): Word[] {
  const arr = words.slice();
  arr.sort((a, b) => {
    const ap = progressById.get(a.id);
    const bp = progressById.get(b.id);
    const primary = primaryCompare(a, ap, b, bp, key);
    if (primary !== 0) return primary;
    return COLLATOR.compare(a.word, b.word);
  });
  return arr;
}
