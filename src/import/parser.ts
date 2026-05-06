import * as XLSX from "xlsx";

export type RawRow = Record<string, string>;

export const REQUIRED_COLUMNS = [
  "Word",
  "Part of Speech",
  "Meaning",
  "Examples",
  "Synonyms",
  "Antonyms",
  "Word Family",
  "Roots / Etymology",
  "Pronunciation",
  "Memory",
  "Confusable With",
  "Tags",
  "Difficulty",
] as const;

export const OPTIONAL_COLUMNS = [
  "ID",
  "Personal Sentence",
  "Cloze Sentence",
] as const;

export type ParseResult =
  | { ok: true; rows: RawRow[]; sheetName: string }
  | { ok: false; error: string };

export type ValidationResult =
  | { ok: true }
  | { ok: false; missing: string[] };

export async function parseFile(file: File): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { ok: false, error: "No sheets found in file." };
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return { ok: false, error: `Sheet "${sheetName}" is empty.` };
    const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
      defval: "",
      raw: false,
    });
    return { ok: true, rows, sheetName };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to parse file.",
    };
  }
}

export function validateColumns(rows: RawRow[]): ValidationResult {
  if (rows.length === 0) {
    return { ok: false, missing: [...REQUIRED_COLUMNS] };
  }
  const present = new Set(Object.keys(rows[0] ?? {}));
  const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c));
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
