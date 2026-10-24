/**
 * FSRS-4.5 (Free Spaced Repetition Scheduler) — Anki'dagi zamonaviy algoritm.
 * Har bir so'z uchun: Stability (S, kunlarda), Difficulty (D, 1..10), Retrievability (R).
 * Bu yerda hisoblanadi, Supabase'ga `record_review` RPC orqali yoziladi.
 */
import type { WordState } from './types';

export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // 19/81

export interface Card {
  stability: number;
  difficulty: number;
  due: Date;
  reps: number;
  lapses: number;
  state: WordState;
  last_review: Date | null;
}

export function newCard(): Card {
  return { stability: 0, difficulty: 5, due: new Date(), reps: 0, lapses: 0, state: 'new', last_review: null };
}

export function retrievability(elapsedDays: number, stability: number) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function clampD(d: number) {
  return Math.min(10, Math.max(1, d));
}
function initStability(g: Grade) {
  return Math.max(0.1, W[g - 1]);
}
function initDifficulty(g: Grade) {
  return clampD(W[4] - (g - 3) * W[5]);
}
function nextDifficulty(d: number, g: Grade) {
  const nd = d - W[6] * (g - 3);
  return clampD(W[7] * initDifficulty(4) + (1 - W[7]) * nd);
}
function nextRecallStability(d: number, s: number, r: number, g: Grade) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy);
}
function nextForgetStability(d: number, s: number, r: number) {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
}

export function intervalDays(stability: number, desiredRetention = 0.9) {
  const i = (stability / FACTOR) * (Math.pow(desiredRetention, 1 / DECAY) - 1);
  return Math.max(1, Math.round(i));
}

/**
 * Takrorlash natijasini qo'llash. Qisqa muddatli ("learning") qadamlar daqiqalarda,
 * uzoq muddatli ("review") qadamlar kunlarda.
 */
export function schedule(card: Card, grade: Grade, now = new Date(), desiredRetention = 0.9): { card: Card; elapsedDays: number } {
  const elapsedDays = card.last_review ? Math.max(0, (now.getTime() - card.last_review.getTime()) / 86400000) : 0;
  const next: Card = { ...card, reps: card.reps + 1, last_review: now };

  if (card.state === 'new') {
    next.difficulty = initDifficulty(grade);
    next.stability = initStability(grade);
    if (grade === 1) {
      next.state = 'learning';
      next.due = addMinutes(now, 1);
    } else if (grade === 2) {
      next.state = 'learning';
      next.due = addMinutes(now, 5);
    } else if (grade === 3) {
      next.state = 'learning';
      next.due = addMinutes(now, 10);
    } else {
      next.state = 'review';
      next.due = addDays(now, intervalDays(next.stability, desiredRetention));
    }
    return { card: next, elapsedDays };
  }

  if (card.state === 'learning' || card.state === 'relearning') {
    if (grade === 1) {
      next.due = addMinutes(now, 5);
    } else if (grade === 2) {
      next.due = addMinutes(now, 10);
    } else {
      // learning bosqichidan chiqish → review
      next.state = 'review';
      const base = card.stability > 0 ? card.stability : initStability(grade);
      next.stability = grade === 4 ? base * W[16] : base;
      next.due = addDays(now, intervalDays(next.stability, desiredRetention));
    }
    return { card: next, elapsedDays };
  }

  // review
  const r = retrievability(elapsedDays, card.stability);
  next.difficulty = nextDifficulty(card.difficulty, grade);
  if (grade === 1) {
    next.stability = Math.max(0.1, nextForgetStability(card.difficulty, card.stability, r));
    next.lapses = card.lapses + 1;
    next.state = 'relearning';
    next.due = addMinutes(now, 5);
  } else {
    next.stability = nextRecallStability(card.difficulty, card.stability, r, grade);
    next.state = 'review';
    next.due = addDays(now, intervalDays(next.stability, desiredRetention));
  }
  return { card: next, elapsedDays };
}

/** Mashq natijasini bahoga aylantirish: to'g'ri/noto'g'ri + javob tezligi + ishora. */
export function gradeFromResult(correct: boolean, responseMs: number, usedHint = false, type?: string): Grade {
  if (!correct) return 1;
  if (usedHint) return 2;
  const fastThreshold = type === 'typing' || type === 'order' ? 9000 : 3500;
  const slowThreshold = type === 'typing' || type === 'order' ? 20000 : 9000;
  if (responseMs <= fastThreshold) return 4;
  if (responseMs >= slowThreshold) return 2;
  return 3;
}

export function cardFromRow(row: { stability: number; difficulty: number; due: string; reps: number; lapses: number; state: WordState; last_review: string | null } | null | undefined): Card {
  if (!row) return newCard();
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    due: new Date(row.due),
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : null,
  };
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}
function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

export function masteryLabel(card: Pick<Card, 'state' | 'stability'>, masteredDays = 21) {
  if (card.state === 'new') return { label: 'Yangi', color: 'text-ink-300', pct: 0 };
  if (card.state === 'learning' || card.state === 'relearning') return { label: 'O‘rganilmoqda', color: 'text-ember-400', pct: 25 };
  if (card.stability >= masteredDays) return { label: 'Mukammal', color: 'text-gold-400', pct: 100 };
  return { label: 'Takrorlashda', color: 'text-teal-400', pct: Math.min(95, Math.round(25 + (card.stability / masteredDays) * 70)) };
}
