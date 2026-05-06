// Cloze generation: take a sentence and a target word/phrase, produce a
// prompt with the target masked out. Returns null if the target can't be
// located inside the sentence — callers should skip those words.
//
// Matching rules:
//   - case-insensitive
//   - whole-word boundaries (Unicode-aware) when the target starts/ends with
//     a letter or digit; otherwise the target may match anywhere
//   - multi-word phrases are matched literally (regex-escaped)

const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const REGEX_META = /[.*+?^${}()|[\]\\]/g;

export interface ClozeResult {
  prompt: string; // sentence with target masked
  matched: string; // exact substring that was masked (case-preserved)
  blank: string; // the placeholder string that replaced the target in `prompt`
}

export function generateCloze(
  sentence: string,
  target: string,
): ClozeResult | null {
  const cleanSentence = (sentence ?? "").trim();
  const cleanTarget = (target ?? "").trim();
  if (!cleanSentence || !cleanTarget) return null;

  const escaped = cleanTarget.replace(REGEX_META, "\\$&");
  const startsAlphanum = LETTER_OR_DIGIT.test(cleanTarget[0]!);
  const endsAlphanum = LETTER_OR_DIGIT.test(
    cleanTarget[cleanTarget.length - 1]!,
  );

  // Unicode-aware word boundaries: only when the target's edges are word-ish.
  const lead = startsAlphanum ? "(?<![\\p{L}\\p{N}])" : "";
  const tail = endsAlphanum ? "(?![\\p{L}\\p{N}])" : "";
  const re = new RegExp(`${lead}${escaped}${tail}`, "iu");

  const match = cleanSentence.match(re);
  if (!match) return null;

  const blank = makeBlank(cleanTarget);
  const prompt = cleanSentence.replace(re, blank);
  return { prompt, matched: match[0], blank };
}

function makeBlank(target: string): string {
  // length-matched underscores per word, joined by their original separators.
  // "ad hoc" → "__ ___"; "well-known" → "____-_____"; "patience" → "________".
  let out = "";
  for (const ch of target) {
    if (LETTER_OR_DIGIT.test(ch)) out += "_";
    else out += ch;
  }
  return out;
}

// Pick the best source sentence for a cloze: explicit `Cloze Sentence` first,
// then the first non-empty line of `Examples`.
export function pickClozeSource(
  clozeSentence: string,
  examples: string,
): string | null {
  const cz = (clozeSentence ?? "").trim();
  if (cz) return cz;
  for (const line of (examples ?? "").split(/\r?\n/)) {
    const t = line.trim();
    if (t) return t;
  }
  return null;
}
