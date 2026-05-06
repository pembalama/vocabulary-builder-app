import Dexie, { type Table } from "dexie";

export interface Word {
  id: string;
  word: string;
  partOfSpeech: string;
  meaning: string;
  examples: string;
  synonyms: string;
  antonyms: string;
  wordFamily: string;
  roots: string;
  pronunciation: string;
  memory: string;
  confusableWith: string;
  tags: string;
  difficulty: string;
  clozeSentence: string;
  sourceRow: number;
  importedAt: number;
  archivedAt: number | null;
}

export interface Progress {
  wordId: string;
  correctCount: number;
  incorrectCount: number;
  lastReviewedAt: number | null;
  nextReviewAt: number;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  masteryLevel: number;
  lapses: number;
  personalSentence: string | null;
  sentenceUpdatedAt: number | null;
}

export interface MetaEntry {
  key: string;
  value: unknown;
}

class VocabDB extends Dexie {
  words!: Table<Word, string>;
  progress!: Table<Progress, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("VocabBuilder");

    this.version(1).stores({
      words: "id, word, partOfSpeech, difficulty, archivedAt",
      progress: "wordId, nextReviewAt, masteryLevel",
      meta: "key",
    });

    // v2: add `lapses` to progress and `clozeSentence` to words. Indexes
    // unchanged; upgrade backfills missing fields on existing rows.
    this.version(2)
      .stores({
        words: "id, word, partOfSpeech, difficulty, archivedAt",
        progress: "wordId, nextReviewAt, masteryLevel",
        meta: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("words")
          .toCollection()
          .modify((w) => {
            if (typeof w.clozeSentence !== "string") w.clozeSentence = "";
          });
        await tx
          .table("progress")
          .toCollection()
          .modify((p) => {
            if (typeof p.lapses !== "number") p.lapses = 0;
          });
      });
  }
}

export const db = new VocabDB();

export const SCHEMA_VERSION = 2;
