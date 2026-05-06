import { db, type Progress, type Word } from "../db/schema";
import { stableHash } from "../lib/hash";
import { normalizeField } from "../lib/normalize";
import type { RawRow } from "./parser";

export interface ImportSummary {
  added: number;
  updated: number;
  archived: number;
  unarchived: number;
  errors: string[];
}

function readCell(row: RawRow, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildId(row: RawRow): string {
  const explicit = readCell(row, "ID");
  if (explicit) return explicit;
  const composite = [
    normalizeField(readCell(row, "Word")),
    normalizeField(readCell(row, "Part of Speech")),
    normalizeField(readCell(row, "Meaning")),
  ].join("|");
  return stableHash(composite);
}

function rowToWord(
  row: RawRow,
  id: string,
  sourceRow: number,
  importedAt: number,
): Word {
  return {
    id,
    word: readCell(row, "Word"),
    partOfSpeech: readCell(row, "Part of Speech"),
    meaning: readCell(row, "Meaning"),
    examples: readCell(row, "Examples"),
    synonyms: readCell(row, "Synonyms"),
    antonyms: readCell(row, "Antonyms"),
    wordFamily: readCell(row, "Word Family"),
    roots: readCell(row, "Roots / Etymology"),
    pronunciation: readCell(row, "Pronunciation"),
    memory: readCell(row, "Memory"),
    confusableWith: readCell(row, "Confusable With"),
    tags: readCell(row, "Tags"),
    difficulty: readCell(row, "Difficulty"),
    clozeSentence: readCell(row, "Cloze Sentence"),
    sourceRow,
    importedAt,
    archivedAt: null,
  };
}

function blankProgress(
  wordId: string,
  now: number,
  initialSentence: string,
): Progress {
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
    personalSentence: initialSentence || null,
    sentenceUpdatedAt: initialSentence ? now : null,
  };
}

export async function importRows(rows: RawRow[]): Promise<ImportSummary> {
  const summary: ImportSummary = {
    added: 0,
    updated: 0,
    archived: 0,
    unarchived: 0,
    errors: [],
  };
  const now = Date.now();

  // Stage 1: build candidate records, deduplicate, surface row-level errors.
  const seen = new Set<string>();
  const staged: { word: Word; sentenceFromSheet: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const sheetRowNumber = i + 2; // header is row 1
    const wordText = readCell(row, "Word");
    if (!wordText) {
      summary.errors.push(`Row ${sheetRowNumber}: empty Word, skipped.`);
      continue;
    }
    if (!readCell(row, "Meaning")) {
      summary.errors.push(`Row ${sheetRowNumber}: empty Meaning, skipped.`);
      continue;
    }
    const id = buildId(row);
    if (seen.has(id)) {
      summary.errors.push(
        `Row ${sheetRowNumber}: duplicate of an earlier row in this file (id ${id}), skipped.`,
      );
      continue;
    }
    seen.add(id);
    staged.push({
      word: rowToWord(row, id, sheetRowNumber, now),
      sentenceFromSheet: readCell(row, "Personal Sentence"),
    });
  }

  // Stage 2: write everything in one transaction.
  await db.transaction("rw", db.words, db.progress, db.meta, async () => {
    const existingWords = await db.words.toArray();
    const existingMap = new Map(existingWords.map((w) => [w.id, w]));

    for (const { word, sentenceFromSheet } of staged) {
      const existing = existingMap.get(word.id);
      if (existing) {
        await db.words.put({ ...word, archivedAt: null });
        if (existing.archivedAt !== null) summary.unarchived++;
        else summary.updated++;

        if (sentenceFromSheet) {
          const existingProgress = await db.progress.get(word.id);
          if (existingProgress && !existingProgress.personalSentence) {
            await db.progress.update(word.id, {
              personalSentence: sentenceFromSheet,
              sentenceUpdatedAt: now,
            });
          } else if (!existingProgress) {
            await db.progress.add(blankProgress(word.id, now, sentenceFromSheet));
          }
        } else if (!(await db.progress.get(word.id))) {
          // Repair: word exists with no progress row (shouldn't happen in normal flow).
          await db.progress.add(blankProgress(word.id, now, ""));
        }
      } else {
        await db.words.add(word);
        await db.progress.add(blankProgress(word.id, now, sentenceFromSheet));
        summary.added++;
      }
    }

    // Stage 3: archive words present before but missing from this import.
    for (const existing of existingWords) {
      if (!seen.has(existing.id) && existing.archivedAt === null) {
        await db.words.update(existing.id, { archivedAt: now });
        summary.archived++;
      }
    }

    await db.meta.put({ key: "lastImportAt", value: now });
  });

  return summary;
}
