import { db, type Progress } from "./schema";
import { applySm2, type Quality } from "../quiz/sm2";

export function freshProgress(wordId: string, now: number): Progress {
  return {
    wordId,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    masteryLevel: 0,
    lapses: 0,
    personalSentence: null,
    sentenceUpdatedAt: null,
  };
}

export async function recordAnswer(
  wordId: string,
  quality: Quality,
): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.progress, async () => {
    const existing = await db.progress.get(wordId);
    const base = existing ?? freshProgress(wordId, now);
    const update = applySm2(base, quality, now);
    if (existing) {
      await db.progress.update(wordId, update);
    } else {
      await db.progress.add({ ...base, ...update });
    }
  });
}

export async function setPersonalSentence(
  wordId: string,
  value: string | null,
): Promise<void> {
  const now = Date.now();
  const trimmed = value?.trim() ?? "";
  const stored = trimmed.length > 0 ? trimmed : null;

  await db.transaction("rw", db.progress, async () => {
    const existing = await db.progress.get(wordId);
    if (existing) {
      await db.progress.update(wordId, {
        personalSentence: stored,
        sentenceUpdatedAt: stored ? now : null,
      });
    } else {
      await db.progress.add({
        ...freshProgress(wordId, now),
        personalSentence: stored,
        sentenceUpdatedAt: stored ? now : null,
      });
    }
  });
}
