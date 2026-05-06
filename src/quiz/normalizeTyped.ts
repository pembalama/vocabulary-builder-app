// Typed-answer normalization.
//
// Goals: tolerate casing/whitespace/diacritics, but PRESERVE meaningful
// punctuation. In particular hyphens stay significant so "re-sign" ≠ "resign".
//
// Steps:
//   1. NFKD-decompose and strip combining diacritic marks (café → cafe)
//   2. lowercase
//   3. strip leading/trailing whitespace
//   4. collapse runs of internal whitespace to a single space
//   5. drop trailing terminal punctuation: . , ! ?  (only at end, only those four)
//
// Things we deliberately do NOT do:
//   - removing internal hyphens, slashes, apostrophes
//   - normalizing "well-known" / "well known" / "wellknown" together
//
// If you want to allow all three of those to match, do it via per-card aliases,
// not by mangling the whole string.

const DIACRITICS_RE = /[̀-ͯ]/g;
const TRAILING_TERMINAL_PUNCT_RE = /[.,!?]+$/;
const INTERNAL_WHITESPACE_RE = /\s+/g;

export function normalizeTyped(s: string): string {
  return s
    .normalize("NFKD")
    .replace(DIACRITICS_RE, "")
    .toLowerCase()
    .trim()
    .replace(INTERNAL_WHITESPACE_RE, " ")
    .replace(TRAILING_TERMINAL_PUNCT_RE, "")
    .trim();
}

export function typedAnswerMatches(input: string, expected: string): boolean {
  const a = normalizeTyped(input);
  const b = normalizeTyped(expected);
  return a.length > 0 && a === b;
}
