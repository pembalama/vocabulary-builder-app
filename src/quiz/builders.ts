import type { Word } from "../db/schema";
import { shuffle } from "../lib/shuffle";
import { generateCloze, pickClozeSource } from "./cloze";
import type {
  ClozeQuestion,
  FlashcardQuestion,
  McQuestion,
  Question,
  QuizType,
  TypedQuestion,
} from "./types";

export interface BuildContext {
  pool: readonly Word[];
}

function commonFields(target: Word) {
  return {
    wordId: target.id,
    word: target.word,
    partOfSpeech: target.partOfSpeech,
    pronunciation: target.pronunciation,
    meaning: target.meaning,
    examples: target.examples,
    synonyms: target.synonyms,
    antonyms: target.antonyms,
    wordFamily: target.wordFamily,
    roots: target.roots,
    memory: target.memory,
    confusableWith: target.confusableWith,
  };
}

function pickMeaningDistractors(
  target: Word,
  pool: readonly Word[],
  count: number,
): string[] {
  const samePos: Word[] = [];
  const otherPos: Word[] = [];
  for (const w of pool) {
    if (w.id === target.id) continue;
    if (!w.meaning || w.meaning === target.meaning) continue;
    if (w.partOfSpeech === target.partOfSpeech) samePos.push(w);
    else otherPos.push(w);
  }
  const seen = new Set<string>([target.meaning]);
  const picks: string[] = [];
  const take = (source: Word[]) => {
    for (const w of shuffle(source)) {
      if (picks.length >= count) return;
      if (seen.has(w.meaning)) continue;
      seen.add(w.meaning);
      picks.push(w.meaning);
    }
  };
  take(samePos);
  if (picks.length < count) take(otherPos);
  return picks;
}

function pickWordDistractors(
  target: Word,
  pool: readonly Word[],
  exclude: ReadonlySet<string>,
  count: number,
): string[] {
  const samePos: Word[] = [];
  const otherPos: Word[] = [];
  for (const w of pool) {
    if (w.id === target.id) continue;
    if (!w.word) continue;
    const lc = w.word.toLowerCase();
    if (exclude.has(lc)) continue;
    if (w.partOfSpeech === target.partOfSpeech) samePos.push(w);
    else otherPos.push(w);
  }
  const seen = new Set<string>(exclude);
  const picks: string[] = [];
  const take = (source: Word[]) => {
    for (const w of shuffle(source)) {
      if (picks.length >= count) return;
      const lc = w.word.toLowerCase();
      if (seen.has(lc)) continue;
      seen.add(lc);
      picks.push(w.word);
    }
  };
  take(samePos);
  if (picks.length < count) take(otherPos);
  return picks;
}

export function buildWordToMeaning(
  target: Word,
  ctx: BuildContext,
): McQuestion | null {
  const distractors = pickMeaningDistractors(target, ctx.pool, 3);
  if (distractors.length < 3) return null;
  const options = shuffle([target.meaning, ...distractors]);
  return {
    kind: "mc",
    type: "wordToMeaning",
    ...commonFields(target),
    promptKind: "word",
    promptText: target.word,
    options,
    correctIndex: options.indexOf(target.meaning),
  };
}

export function buildMeaningToWord(
  target: Word,
  ctx: BuildContext,
): McQuestion | null {
  const distractors = pickWordDistractors(
    target,
    ctx.pool,
    new Set([target.word.toLowerCase()]),
    3,
  );
  if (distractors.length < 3) return null;
  const options = shuffle([target.word, ...distractors]);
  return {
    kind: "mc",
    type: "meaningToWord",
    ...commonFields(target),
    promptKind: "meaning",
    promptText: target.meaning,
    options,
    correctIndex: options.indexOf(target.word),
  };
}

export function buildTyped(target: Word): TypedQuestion {
  return {
    kind: "typed",
    type: "typed",
    ...commonFields(target),
    promptText: target.meaning,
  };
}

export function buildFlashcard(target: Word): FlashcardQuestion {
  return {
    kind: "flashcard",
    type: "flashcard",
    ...commonFields(target),
  };
}

export function parseConfusableList(raw: string): string[] {
  return raw
    .split(/[,;|/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildConfusables(
  target: Word,
  ctx: BuildContext,
): McQuestion | null {
  const names = parseConfusableList(target.confusableWith).map((s) =>
    s.toLowerCase(),
  );
  if (names.length === 0) return null;

  const found: Word[] = [];
  for (const w of ctx.pool) {
    if (w.id === target.id) continue;
    if (names.includes(w.word.toLowerCase())) found.push(w);
  }
  const distractors = shuffle(found)
    .slice(0, 3)
    .map((w) => w.word);

  if (distractors.length < 3) {
    const exclude = new Set<string>([
      target.word.toLowerCase(),
      ...distractors.map((s) => s.toLowerCase()),
      ...names,
    ]);
    distractors.push(
      ...pickWordDistractors(target, ctx.pool, exclude, 3 - distractors.length),
    );
  }
  if (distractors.length < 3) return null;

  const options = shuffle([target.word, ...distractors]);
  return {
    kind: "mc",
    type: "confusables",
    ...commonFields(target),
    promptKind: "meaning",
    promptText: target.meaning,
    options,
    correctIndex: options.indexOf(target.word),
  };
}

export function buildCloze(target: Word): ClozeQuestion | null {
  const source = pickClozeSource(target.clozeSentence ?? "", target.examples);
  if (!source) return null;
  const result = generateCloze(source, target.word);
  if (!result) return null;
  return {
    kind: "cloze",
    type: "cloze",
    ...commonFields(target),
    sentence: source,
    prompt: result.prompt,
    blank: result.blank,
    matchTarget: result.matched,
  };
}

export function buildQuestion(
  type: QuizType,
  target: Word,
  ctx: BuildContext,
): Question | null {
  switch (type) {
    case "wordToMeaning":
      return buildWordToMeaning(target, ctx);
    case "meaningToWord":
      return buildMeaningToWord(target, ctx);
    case "typed":
      return buildTyped(target);
    case "flashcard":
      return buildFlashcard(target);
    case "confusables":
      return buildConfusables(target, ctx);
    case "cloze":
      return buildCloze(target);
  }
}
