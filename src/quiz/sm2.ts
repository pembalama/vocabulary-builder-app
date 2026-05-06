import type { Progress } from "../db/schema";

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export interface Sm2Update {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number;
  masteryLevel: number;
  lastReviewedAt: number;
  correctCount: number;
  incorrectCount: number;
  lapses: number;
}

// Reference: https://super-memory.com/english/ol/sm2.htm
export function applySm2(
  prev: Progress,
  quality: Quality,
  now: number,
): Sm2Update {
  let { easeFactor, intervalDays, repetitions } = prev;
  const wasLearned = prev.repetitions > 0;

  // EF is updated on every answer, including failures.
  easeFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;

  if (quality >= 3) {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
    repetitions = repetitions + 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  const correct = quality >= 3;
  const isLapse = !correct && wasLearned;
  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
    masteryLevel: deriveMasteryLevel(intervalDays, repetitions),
    correctCount: prev.correctCount + (correct ? 1 : 0),
    incorrectCount: prev.incorrectCount + (correct ? 0 : 1),
    lapses: prev.lapses + (isLapse ? 1 : 0),
  };
}

export function deriveMasteryLevel(
  intervalDays: number,
  repetitions: number,
): number {
  if (repetitions === 0) return 0;
  if (intervalDays >= 60) return 5;
  if (intervalDays >= 21) return 4;
  if (intervalDays >= 7) return 3;
  if (intervalDays >= 2) return 2;
  return 1;
}

// MC correct → 4, MC wrong → 1.
export function mcQuality(correct: boolean): Quality {
  return correct ? 4 : 1;
}

// Flashcard self-grading buttons (Anki-style).
export const FLASHCARD_GRADES = [
  { quality: 1, label: "Again", description: "Forgot it" },
  { quality: 3, label: "Hard", description: "Recalled with difficulty" },
  { quality: 4, label: "Good", description: "Recalled correctly" },
  { quality: 5, label: "Easy", description: "Trivial" },
] as const satisfies readonly {
  quality: Quality;
  label: string;
  description: string;
}[];

// Leech detection — derived heuristic, no schema flag. Tweak thresholds later
// if needed; the data we collect (lapses + incorrectCount) is enough to
// support a future "leech focus" review mode without further migration.
export const LEECH_LAPSES_THRESHOLD = 5;
export const LEECH_INCORRECT_THRESHOLD = 8;

export function isLeech(p: {
  lapses: number;
  incorrectCount: number;
}): boolean {
  return (
    p.lapses >= LEECH_LAPSES_THRESHOLD ||
    p.incorrectCount >= LEECH_INCORRECT_THRESHOLD
  );
}
