import type { Word, Lesson, LessonProgress, Unit } from './types';
import { buildPool, type PoolMode } from './wordpool';
import type { UserWord } from './types';
export function eligibleWords(id: string, words: Word[]) {
  const seen = new Set<string>();
  const unique = words.filter(w => { const key=w.tr.normalize('NFC').toLocaleLowerCase('tr-TR'); if(seen.has(key)) return false; seen.add(key); return true; });
  if (id === 'anagram' || id === 'bridge') return unique.filter(w => /^[a-zçğıöşüâîû]{3,10}$/iu.test(w.tr));
  return unique;
}
export function gamePool(id: string, all: Word[], lessons: Lesson[], progress: LessonProgress[], states: UserWord[], min: number, mode: PoolMode) {
  const known = new Set(states.filter(s=>s.state!=='new').map(s=>s.word_id));
  const ordered = [...all.filter(w=>known.has(w.id)), ...all.filter(w=>!known.has(w.id))];
  return buildPool(eligibleWords(id, ordered), lessons, progress, states, min, mode);
}
export function orderedLessons(lessons: Lesson[], units: Unit[]) {
  const order = new Map(units.map(u => [u.id, u.order_index]));
  return lessons.slice().sort((a,b) => (order.get(a.unit_id) ?? a.unit_id) - (order.get(b.unit_id) ?? b.unit_id) || a.order_index-b.order_index || a.id-b.id);
}
export function lessonIsOpen(id: number, ordered: Lesson[], progress: LessonProgress[]) {
  const status = new Map(progress.map(p => [p.lesson_id,p.status]));
  const first = ordered.find(l => status.get(l.id) !== 'completed');
  return ordered.some(l=>l.id===id) && (id === first?.id || ['completed','in_progress','available'].includes(status.get(id) ?? 'locked'));
}
