export function normalizeField(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
