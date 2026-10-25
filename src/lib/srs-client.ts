'use client';
import { cardFromRow, gradeFromResult, schedule } from './fsrs';
import { fetchUserWords, recordReview } from './data';
import { createReviewQueue } from './review-queue';
import type { UserWord } from './types';
const sessions = new Set<SrsSession>();
export async function flushGameReviews(mode: string, retry = false) {
  let failures = 0;
  for (const session of [...sessions]) {
    if (session.mode !== mode) continue;
    const failed = await session.flush(retry); failures += failed;
    if (!failed) sessions.delete(session);
  }
  return failures;
}
export class SrsSession {
  private cards = new Map<number, UserWord>();
  private loading: Promise<void> | null = null;
  private queue = createReviewQueue();
  constructor(readonly mode: string, private retention = 0.9) {}
  load() {
    if (!this.loading) this.loading = fetchUserWords().then(rows => { this.cards = new Map(rows.map(w=>[w.word_id,w])); }).catch(error=>{this.loading=null;throw error;});
    // Existing callers load in an effect; grading will retry if loading failed.
    return this.loading.catch(()=>{});
  }
  grade(wordId: number | undefined, correct: boolean, responseMs: number, type?: string, usedHint=false) {
    if (!wordId) return;
    sessions.add(this);
    this.queue.add(async () => {
      if (!this.loading) this.load();
      await this.loading;
      const prev=this.cards.get(wordId);
      const grade=gradeFromResult(correct,responseMs,usedHint,type);
      const {card,elapsedDays}=schedule(cardFromRow(prev),grade,new Date(),this.retention);
      await recordReview(wordId,grade,correct,card,responseMs,this.mode,elapsedDays);
      this.cards.set(wordId,{user_id:prev?.user_id??'',word_id:wordId,stability:card.stability,difficulty:card.difficulty,due:card.due.toISOString(),reps:card.reps,lapses:card.lapses,state:card.state,last_review:new Date().toISOString()});
    });
  }
  flush(retry=false) { return this.queue.flush(retry); }
  state(wordId:number) { return this.cards.get(wordId) ?? null; }
}
