/**
 * O'yinlar uchun so'z havzasi.
 *  - "known" (standart): FAQAT o'rganilgan so'zlar — SRS'da ko'rilgan so'zlar.
 *  - "extended": tanish so'zlar kam bo'lsa keyingi darslardan to'ldiriladi (foydalanuvchi o'zi tanlaydi).
 * Oldingi xato: "available" (ochiq, lekin o'tilmagan) darslar so'zlari ham "tanish" hisoblanardi — shu sababli
 * o'yinlarda hali o'rganilmagan so'zlar chiqib kelardi.
 */
import type { Word, Lesson, LessonProgress, UserWord } from './types';

export type PoolMode = 'known' | 'extended';
const KEY = 'tezbil.pool';

export function getPoolMode(): PoolMode {
  try { const v = localStorage.getItem(KEY); if (v === 'extended') return 'extended'; } catch { /* noop */ }
  return 'known';
}
export function setPoolMode(m: PoolMode) { try { localStorage.setItem(KEY, m); } catch { /* noop */ } }

/** Darslar tartibi (bo'lim → dars) */
export function lessonOrder(lessons: Lesson[]): Lesson[] {
  return lessons.slice().sort((a, b) => a.unit_id - b.unit_id || a.order_index - b.order_index);
}

/** Haqiqatan o'rganilgan so'zlar: SRS'da amalda mashq qilingan (state ≠ new) so'zlar */
export function learnedWords(all: Word[], progress: LessonProgress[], userWords: UserWord[] = []): Word[] {
  // Darsni ochish yoki tugatish undagi barcha so'zlarni ko'rganlikni anglatmaydi.
  void progress;
  const seen = new Set(userWords.filter((u) => u.state && u.state !== 'new').map((u) => u.word_id));
  return all.filter((w) => seen.has(w.id));
}

/** Kam bo'lsa — keyingi (hali o'tilmagan) darslar so'zlari bilan to'ldirish */
export function extendWords(known: Word[], all: Word[], lessons: Lesson[], min: number): Word[] {
  if (known.length >= min) return known;
  const have = new Set(known.map((w) => w.id));
  const covered = new Set(known.map((w) => w.lesson_id).filter(Boolean));
  let out = known.slice();
  for (const les of lessonOrder(lessons)) {
    if (out.length >= min) break;
    if (covered.has(les.id)) continue;
    for (const w of all) { if (out.length >= min) break; if (w.lesson_id === les.id && !have.has(w.id)) { out.push(w); have.add(w.id); } }
  }
  if (out.length < min) for (const w of all) { if (out.length >= min) break; if (!have.has(w.id)) { out.push(w); have.add(w.id); } }
  return out;
}

export interface Pool { words: Word[]; known: Word[]; extended: boolean; enough: boolean }

/** O'yin uchun yakuniy havza. `min` — o'yinning minimal talabi. */
/** Bir o'yinda ko'pi bilan shuncha YANGI so'z tanishtiriladi (o'yin oldidan kartalar) — ortig'i charchatadi */
export const MAX_NEW_PER_GAME = 10;

export function buildPool(all: Word[], lessons: Lesson[], progress: LessonProgress[], userWords: UserWord[], min: number, mode: PoolMode): Pool {
  const known = learnedWords(all, progress, userWords);
  if (mode === 'extended') {
    // Yetishmayotgan + ozgina zaxira; lekin bir o'yinda MAX_NEW_PER_GAME dan ko'p yangi so'z emas (o'yin talabi undan katta bo'lsa — talabgacha)
    const maxNew = Math.max(MAX_NEW_PER_GAME, min - known.length);
    const target = Math.min(Math.max(min, known.length + 6), known.length + maxNew);
    const words = extendWords(known, all, lessons, target);
    return { words, known, extended: words.length > known.length, enough: words.length >= min };
  }
  return { words: known, known, extended: false, enough: known.length >= min };
}

/** Keyingi o'tilmagan dars (havola uchun) */
export function nextLessonId(lessons: Lesson[], progress: LessonProgress[]): number | null {
  const done = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  const inProg = progress.find((p) => p.status === 'in_progress');
  if (inProg) return inProg.lesson_id;
  return lessonOrder(lessons).find((x) => !done.has(x.id))?.id ?? null;
}
