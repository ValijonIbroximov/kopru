'use client';
/** O'yinlar uchun yengil SRS yordamchisi: bir marta yuklaydi, har javobda FSRS hisoblab serverga yozadi. */
import { cardFromRow, gradeFromResult, schedule } from './fsrs';
import { fetchUserWords, recordReview } from './data';
import type { UserWord } from './types';

export class SrsSession {
  private cards = new Map<number, UserWord>();
  private loaded = false;
  constructor(private mode: string, private retention = 0.9) {}

  async load() {
    if (this.loaded) return;
    try { const uw = await fetchUserWords(); this.cards = new Map(uw.map((w) => [w.word_id, w])); } catch { /* noop */ }
    this.loaded = true;
  }

  /** To'g'ri/noto'g'ri javobni FSRS ga yozish (fon rejimida). */
  grade(wordId: number | undefined, correct: boolean, responseMs: number, type?: string, usedHint = false) {
    if (!wordId) return;
    const prev = this.cards.get(wordId);
    const g = gradeFromResult(correct, responseMs, usedHint, type);
    const { card, elapsedDays } = schedule(cardFromRow(prev), g, new Date(), this.retention);
    this.cards.set(wordId, { user_id: prev?.user_id ?? '', word_id: wordId, stability: card.stability, difficulty: card.difficulty, due: card.due.toISOString(), reps: card.reps, lapses: card.lapses, state: card.state, last_review: new Date().toISOString() });
    recordReview(wordId, g, correct, card, responseMs, this.mode, elapsedDays).catch(() => {});
  }

  state(wordId: number) { return this.cards.get(wordId) ?? null; }
}
