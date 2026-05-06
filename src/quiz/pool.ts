import type { Progress, Word } from "../db/schema";
import { splitTags } from "../lib/normalize";
import { shuffle } from "../lib/shuffle";
import { pickClozeSource } from "./cloze";
import type { PoolMode, QuizFilters, QuizType } from "./types";

export function isDue(
  word: Word,
  progressById: ReadonlyMap<string, Progress>,
  now: number,
): boolean {
  const p = progressById.get(word.id);
  return !p || p.nextReviewAt <= now;
}

export function passesFilters(word: Word, filters: QuizFilters): boolean {
  if (filters.partOfSpeech && word.partOfSpeech !== filters.partOfSpeech) {
    return false;
  }
  if (filters.difficulty && word.difficulty !== filters.difficulty) {
    return false;
  }
  if (filters.tag) {
    const tags = splitTags(word.tags).map((t) => t.toLowerCase());
    if (!tags.includes(filters.tag.toLowerCase())) return false;
  }
  return true;
}

export function isEligibleForType(type: QuizType, word: Word): boolean {
  if (type === "confusables") return word.confusableWith.trim().length > 0;
  if (type === "cloze") {
    return pickClozeSource(word.clozeSentence ?? "", word.examples) !== null;
  }
  return true;
}

export interface QueueOptions {
  poolMode: PoolMode;
  filters: QuizFilters;
  type: QuizType;
  now: number;
}

export function eligibleWords(
  pool: readonly Word[],
  progressById: ReadonlyMap<string, Progress>,
  opts: QueueOptions,
): Word[] {
  return pool.filter((w) => {
    if (w.archivedAt !== null) return false;
    if (!w.meaning) return false;
    if (!isEligibleForType(opts.type, w)) return false;
    if (!passesFilters(w, opts.filters)) return false;
    if (opts.poolMode === "all") return true;
    return isDue(w, progressById, opts.now);
  });
}

export function buildQueue(
  pool: readonly Word[],
  progressById: ReadonlyMap<string, Progress>,
  opts: QueueOptions,
): Word[] {
  return shuffle(eligibleWords(pool, progressById, opts));
}
