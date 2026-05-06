import type { Quality } from "./sm2";

export interface HintMaterial {
  word: string;
  pronunciation: string;
  roots: string;
}

// Build a progressive hint ladder for a target word. The card shows hint i+1
// when the user clicks "Show hint" for the (i+1)-th time. Hints are independent
// of pool/mode/scoring; quality is computed separately by `hintedQuality`.
//
// Ladder:
//   1. First letter visible, rest masked
//   2. First half visible, rest masked
//   3. Pronunciation (if present), else roots/etymology (if present)
//
// Non-letter characters (spaces, hyphens) are preserved in masked output so
// "well-known" stays shaped like "w___-_____", giving a useful structural cue
// without leaking spelling.
export function buildHints(material: HintMaterial): string[] {
  const word = material.word ?? "";
  if (!word.trim()) return [];

  const hints: string[] = [];
  hints.push(maskExceptFirst(word, 1));

  const halfReveal = Math.max(1, Math.ceil(countLetters(word) / 2));
  if (halfReveal > 1) {
    const half = maskExceptFirst(word, halfReveal);
    if (half !== hints[0]) hints.push(half);
  }

  const aux =
    (material.pronunciation || "").trim() || (material.roots || "").trim();
  if (aux) hints.push(aux);

  return hints;
}

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

function countLetters(s: string): number {
  let n = 0;
  for (const ch of s) if (LETTER_OR_DIGIT.test(ch)) n++;
  return n;
}

function maskExceptFirst(word: string, revealCount: number): string {
  let revealed = 0;
  let out = "";
  for (const ch of word) {
    if (!LETTER_OR_DIGIT.test(ch)) {
      out += ch;
      continue;
    }
    if (revealed < revealCount) {
      out += ch;
      revealed++;
    } else {
      out += "_";
    }
  }
  return out;
}

// Quality scoring with hints applied. Used by Typed and Cloze modes.
//   0 hints + correct → 5
//   1 hint  + correct → 4
//   2+      + correct → 3
//   any     + wrong   → 1
export function hintedQuality(hintsUsed: number, correct: boolean): Quality {
  if (!correct) return 1;
  if (hintsUsed <= 0) return 5;
  if (hintsUsed === 1) return 4;
  return 3;
}
