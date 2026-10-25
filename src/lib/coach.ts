import type { UserWord, Word } from './types';
/** Deterministic selection: due first, then high lapse rate, then oldest review. */
export function coachWords(words: Word[], states: UserWord[], now = Date.now()): Word[] {
  const byId = new Map(words.map(w => [w.id, w]));
  return states.filter(s => s.state !== 'new' && s.reps > 0 && byId.has(s.word_id)).slice().sort((a,b) => {
    const rank = (s: UserWord) => (Date.parse(s.due) <= now ? 100 : 0) + 40 * s.lapses / Math.max(1, s.reps) + (s.state === 'relearning' ? 20 : 0);
    return rank(b) - rank(a) || Date.parse(a.last_review ?? '1970-01-01') - Date.parse(b.last_review ?? '1970-01-01') || a.word_id - b.word_id;
  }).map(s => byId.get(s.word_id)!);
}
