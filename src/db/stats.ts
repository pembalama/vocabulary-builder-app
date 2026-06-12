import { db } from "./schema";

// Daily review log, stored as a single meta row. Powers the streak counter
// and "reviews today" on the Home dashboard. Kept separate from per-word
// progress so it survives word archival and costs one small object.

export interface DayStat {
  total: number;
  correct: number;
}

export type ReviewLog = Record<string, DayStat>;

export const REVIEW_LOG_KEY = "reviewLog";
const MAX_LOG_DAYS = 400;

// Local-timezone calendar key, e.g. "2026-06-12".
export function dateKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Step back one calendar day via Date arithmetic (DST-safe, unlike -24h).
function prevDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - 1).getTime());
}

// Meta values come back as `unknown` — validate the shape defensively so a
// corrupted row degrades to an empty log instead of crashing the app.
export function sanitizeReviewLog(value: unknown): ReviewLog {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const out: ReviewLog = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    if (typeof v !== "object" || v === null) continue;
    const { total, correct } = v as Partial<DayStat>;
    if (typeof total !== "number" || typeof correct !== "number") continue;
    out[k] = { total, correct };
  }
  return out;
}

// Record one answered question. Must run inside a transaction covering db.meta.
export async function bumpReviewLog(
  now: number,
  correct: boolean,
): Promise<void> {
  const entry = await db.meta.get(REVIEW_LOG_KEY);
  const log = sanitizeReviewLog(entry?.value);
  const key = dateKey(now);
  const day = log[key] ?? { total: 0, correct: 0 };
  log[key] = {
    total: day.total + 1,
    correct: day.correct + (correct ? 1 : 0),
  };

  const keys = Object.keys(log).sort();
  while (keys.length > MAX_LOG_DAYS) {
    const oldest = keys.shift();
    if (oldest) delete log[oldest];
  }
  await db.meta.put({ key: REVIEW_LOG_KEY, value: log });
}

// Consecutive days with at least one review, counting back from today.
// A day with zero reviews so far today doesn't break the streak — it just
// hasn't extended it yet.
export function computeStreak(log: ReviewLog, now: number): number {
  let key = dateKey(now);
  if (!log[key]) key = prevDayKey(key);
  let streak = 0;
  while (log[key]) {
    streak++;
    key = prevDayKey(key);
  }
  return streak;
}
