import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

export function useDueCount(): number | undefined {
  return useLiveQuery(async () => {
    const now = Date.now();
    const [words, progress] = await Promise.all([
      db.words.toArray(),
      db.progress.toArray(),
    ]);
    const progressById = new Map(progress.map((p) => [p.wordId, p]));
    let count = 0;
    for (const w of words) {
      if (w.archivedAt !== null) continue;
      if (!w.meaning) continue;
      const p = progressById.get(w.id);
      if (!p || p.nextReviewAt <= now) count++;
    }
    return count;
  }, []);
}
