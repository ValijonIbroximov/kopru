'use client';
/**
 * DEMO / OFLAYN rejim: Supabase sozlanmagan bo'lsa yoki tarmoq yo'q bo'lsa —
 * kontent o'rnatilgan seed.json dan, progress localStorage dan.
 */
import seed from '@/content/seed.json';
import type { Profile, Unit, Lesson, Word, GrammarTopic, UserWord, LessonProgress } from './types';
import { todayKey } from './utils';

const KEY = 'kopru.local.v1';

interface LocalDb {
  profile: Profile;
  user_words: Record<number, UserWord>;
  lesson_progress: Record<number, LessonProgress>;
  daily: Record<string, { xp: number; minutes: number; reviews: number; correct: number; sessions: number; modes: Record<string, number> }>;
  reviews: { word_id: number; correct: boolean; mode: string; at: string }[];
  sessions: Record<string, { id: string; mode: string; lesson_id: number | null; state: unknown; status: string; updated_at: string }>;
}

function fresh(): LocalDb {
  return {
    profile: {
      id: 'local', username: 'mehmon', display_name: 'Mehmon', avatar: '🦉', role: 'admin', level_cefr: 'A1', xp: 0, level: 1, weekly_xp: 0,
      league: 'bronze', streak: 0, best_streak: 0, streak_freezes: 1, last_active_date: null, daily_goal_min: 10, tz: 'Asia/Tashkent',
      interests: {}, settings: {}, onboarded: true, banned: false, created_at: new Date().toISOString(),
    },
    user_words: {}, lesson_progress: { 1: { user_id: 'local', lesson_id: 1, status: 'available', best_score: 0, stars: 0, attempts: 0, completed_at: null } },
    daily: {}, reviews: [], sessions: {},
  };
}

export function loadLocal(): LocalDb {
  if (typeof window === 'undefined') return fresh();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* noop */ }
  return fresh();
}
export function saveLocal(db: LocalDb) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* noop */ }
}
export function resetLocal() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}

export const localContent = {
  units: seed.units as unknown as Unit[],
  lessons: seed.lessons as unknown as Lesson[],
  words: seed.words as unknown as Word[],
  grammar: seed.grammar as unknown as GrammarTopic[],
};

export function localAddXp(amount: number, _reason: string) {
  const db = loadLocal();
  const p = db.profile;
  const today = todayKey(p.tz);
  let event = 'none';
  if (!p.last_active_date) { p.streak = 1; event = 'start'; }
  else if (p.last_active_date !== today) {
    const diff = Math.round((new Date(today).getTime() - new Date(p.last_active_date).getTime()) / 86400000);
    if (diff === 1) { p.streak += 1; event = 'extended'; }
    else if (diff === 2 && p.streak_freezes > 0) { p.streak_freezes -= 1; p.streak += 1; event = 'freeze_used'; }
    else { p.streak = 1; event = 'reset'; }
  }
  p.last_active_date = today;
  p.xp += amount; p.weekly_xp += amount;
  const newLevel = Math.floor(Math.sqrt(p.xp / 75)) + 1;
  const leveled = newLevel > p.level;
  p.level = newLevel;
  p.best_streak = Math.max(p.best_streak, p.streak);
  const d = (db.daily[today] ??= { xp: 0, minutes: 0, reviews: 0, correct: 0, sessions: 0, modes: {} });
  d.xp += amount;
  saveLocal(db);
  return { xp: p.xp, level: p.level, leveled_up: leveled, streak: p.streak, streak_event: event, freezes: p.streak_freezes };
}

export function localStats() {
  const db = loadLocal();
  const uw = Object.values(db.user_words);
  const heat = Object.entries(db.daily).map(([day, d]) => ({ day, xp: d.xp, minutes: d.minutes, reviews: d.reviews })).sort((a, b) => a.day.localeCompare(b.day));
  const totals = Object.values(db.daily).reduce((a, d) => ({ minutes: a.minutes + d.minutes, reviews: a.reviews + d.reviews, correct: a.correct + d.correct, sessions: a.sessions + d.sessions }), { minutes: 0, reviews: 0, correct: 0, sessions: 0 });
  const modes: Record<string, { total: number; correct: number }> = {};
  for (const r of db.reviews) { const m = (modes[r.mode] ??= { total: 0, correct: 0 }); m.total++; if (r.correct) m.correct++; }
  return {
    today: db.daily[todayKey()] ?? null,
    heatmap: heat,
    words: {
      new: uw.filter((w) => w.state === 'new').length,
      learning: uw.filter((w) => w.state === 'learning' || w.state === 'relearning').length,
      review: uw.filter((w) => w.state === 'review' && w.stability < 21).length,
      mastered: uw.filter((w) => w.state === 'review' && w.stability >= 21).length,
      due: uw.filter((w) => new Date(w.due).getTime() <= Date.now()).length,
      total_words: localContent.words.length,
    },
    modes,
    lessons: { completed: Object.values(db.lesson_progress).filter((l) => l.status === 'completed').length, total: localContent.lessons.length },
    totals: { ...totals, active_days: heat.filter((h) => h.xp > 0).length, duels_won: 0, duels: 0 },
    recent_errors: uw.filter((w) => w.lapses > 0).sort((a, b) => b.lapses - a.lapses).slice(0, 10).map((w) => { const word = localContent.words.find((x) => x.id === w.word_id); return { tr: word?.tr ?? '', uz: word?.uz ?? '', lapses: w.lapses }; }),
    achievements: [],
    rank: 1,
  };
}
