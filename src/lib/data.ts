'use client';
/**
 * Yagona ma'lumot qatlami (klient). Supabase sozlangan bo'lsa — Supabase,
 * bo'lmasa — localStorage (demo/oflayn). Sahifalar faqat shu funksiyalarni chaqiradi.
 */
import { supabaseBrowser, hasSupabaseEnv } from './supabase/client';
import { loadLocal, saveLocal, localContent, localAddXp, localStats } from './local';
import type { Profile, Unit, Lesson, Word, GrammarTopic, UserWord, LessonProgress, UserQuest, Quest, AiKind, AiResponse, AppSettings } from './types';
import type { Card } from './fsrs';
import { todayKey, uid } from './utils';
import { DEFAULT_SETTINGS } from './settings';

export const isLocal = () => !hasSupabaseEnv();

export interface DueItem { word: Word; state: UserWord | null }

// ---------- Profil ----------
export async function fetchProfile(): Promise<Profile | null> {
  if (isLocal()) return loadLocal().profile;
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function updateProfile(patch: Partial<Profile>) {
  if (isLocal()) { const db = loadLocal(); db.profile = { ...db.profile, ...patch }; saveLocal(db); return; }
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return;
  await sb.from('profiles').update(patch).eq('id', auth.user.id);
}

// ---------- Kontent ----------
export async function fetchUnits(): Promise<Unit[]> {
  if (isLocal()) return localContent.units;
  const { data } = await supabaseBrowser().from('units').select('*').eq('is_published', true).order('order_index');
  return (data as Unit[]) ?? [];
}
export async function fetchLessons(): Promise<Lesson[]> {
  if (isLocal()) return localContent.lessons;
  const { data } = await supabaseBrowser().from('lessons').select('*').eq('is_published', true).order('order_index');
  return (data as Lesson[]) ?? [];
}
export async function fetchLesson(id: number): Promise<Lesson | null> {
  if (isLocal()) return localContent.lessons.find((l) => l.id === id) ?? null;
  const { data } = await supabaseBrowser().from('lessons').select('*').eq('id', id).maybeSingle();
  return (data as Lesson) ?? null;
}
export async function fetchWords(lessonId?: number): Promise<Word[]> {
  if (isLocal()) return lessonId ? localContent.words.filter((w) => w.lesson_id === lessonId) : localContent.words;
  let q = supabaseBrowser().from('words').select('*').order('id');
  if (lessonId) q = q.eq('lesson_id', lessonId);
  const { data } = await q;
  return (data as Word[]) ?? [];
}
export async function fetchGrammar(lessonId?: number): Promise<GrammarTopic[]> {
  if (isLocal()) return lessonId ? localContent.grammar.filter((g) => g.lesson_id === lessonId) : localContent.grammar;
  let q = supabaseBrowser().from('grammar_topics').select('*').order('order_index');
  if (lessonId) q = q.eq('lesson_id', lessonId);
  const { data } = await q;
  return (data as GrammarTopic[]) ?? [];
}

export async function fetchSettings(): Promise<AppSettings> {
  if (isLocal()) return DEFAULT_SETTINGS;
  const { loadSettings } = await import('./settings');
  return loadSettings(supabaseBrowser());
}

// ---------- Progress ----------
export async function fetchLessonProgress(): Promise<LessonProgress[]> {
  if (isLocal()) return Object.values(loadLocal().lesson_progress);
  const { data } = await supabaseBrowser().from('lesson_progress').select('*');
  return (data as LessonProgress[]) ?? [];
}

export async function markLessonStarted(lessonId: number) {
  if (isLocal()) {
    const db = loadLocal();
    const lp = db.lesson_progress[lessonId] ?? { user_id: 'local', lesson_id: lessonId, status: 'available', best_score: 0, stars: 0, attempts: 0, completed_at: null };
    if (lp.status !== 'completed') lp.status = 'in_progress';
    db.lesson_progress[lessonId] = lp;
    saveLocal(db);
    return;
  }
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return;
  await sb.from('lesson_progress').upsert({ user_id: auth.user.id, lesson_id: lessonId, status: 'in_progress' }, { onConflict: 'user_id,lesson_id', ignoreDuplicates: false });
}

export async function completeLesson(lessonId: number, score: number, stars: number): Promise<number | null> {
  if (isLocal()) {
    const db = loadLocal();
    const lp = db.lesson_progress[lessonId] ?? { user_id: 'local', lesson_id: lessonId, status: 'available', best_score: 0, stars: 0, attempts: 0, completed_at: null };
    lp.status = 'completed'; lp.best_score = Math.max(lp.best_score, score); lp.stars = Math.max(lp.stars, stars); lp.attempts++; lp.completed_at ??= new Date().toISOString();
    db.lesson_progress[lessonId] = lp;
    const lessons = localContent.lessons;
    const units = localContent.units;
    const sorted = lessons.slice().sort((a, b) => (units.find((u) => u.id === a.unit_id)?.order_index ?? 0) - (units.find((u) => u.id === b.unit_id)?.order_index ?? 0) || a.order_index - b.order_index);
    const idx = sorted.findIndex((l) => l.id === lessonId);
    const next = sorted[idx + 1];
    if (next && !db.lesson_progress[next.id]) db.lesson_progress[next.id] = { user_id: 'local', lesson_id: next.id, status: 'available', best_score: 0, stars: 0, attempts: 0, completed_at: null };
    saveLocal(db);
    return next?.id ?? null;
  }
  const { data } = await supabaseBrowser().rpc('complete_lesson', { p_lesson_id: lessonId, p_score: score, p_stars: stars });
  return (data as { next_lesson_id: number | null } | null)?.next_lesson_id ?? null;
}

// ---------- SRS ----------
export async function fetchUserWords(): Promise<UserWord[]> {
  if (isLocal()) return Object.values(loadLocal().user_words);
  const { data } = await supabaseBrowser().from('user_words').select('*');
  return (data as UserWord[]) ?? [];
}

/** Navbatdagi so'zlar: muddati kelganlar + yangi so'zlar (limit bilan) */
export async function fetchDue(limit = 20, newLimit = 6): Promise<DueItem[]> {
  const [words, states] = await Promise.all([fetchWords(), fetchUserWords()]);
  const byId = new Map(states.map((s) => [s.word_id, s]));
  const now = Date.now();
  const due = states.filter((s) => new Date(s.due).getTime() <= now).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  const items: DueItem[] = [];
  for (const s of due) {
    const w = words.find((x) => x.id === s.word_id);
    if (w) items.push({ word: w, state: s });
    if (items.length >= limit) break;
  }
  if (items.length < limit) {
    // yangi so'zlar: tugallangan darslardan boshlab
    const progress = await fetchLessonProgress();
    const seenLessons = new Set(progress.filter((p) => p.status === 'completed' || p.status === 'in_progress').map((p) => p.lesson_id));
    const candidates = words.filter((w) => !byId.has(w.id) && w.lesson_id && seenLessons.has(w.lesson_id));
    for (const w of candidates.slice(0, Math.min(newLimit, limit - items.length))) items.push({ word: w, state: null });
  }
  return items;
}

export async function recordReview(wordId: number, grade: number, correct: boolean, card: Card, responseMs: number, mode: string, elapsedDays: number) {
  if (isLocal()) {
    const db = loadLocal();
    const prev = db.user_words[wordId];
    db.user_words[wordId] = {
      user_id: 'local', word_id: wordId, stability: card.stability, difficulty: card.difficulty, due: card.due.toISOString(),
      reps: (prev?.reps ?? 0) + 1, lapses: (prev?.lapses ?? 0) + (grade === 1 ? 1 : 0), state: card.state, last_review: new Date().toISOString(),
    };
    db.reviews.push({ word_id: wordId, correct, mode, at: new Date().toISOString() });
    if (db.reviews.length > 2000) db.reviews = db.reviews.slice(-2000);
    const d = (db.daily[todayKey()] ??= { xp: 0, minutes: 0, reviews: 0, correct: 0, sessions: 0, modes: {} });
    d.reviews++; if (correct) d.correct++;
    saveLocal(db);
    return;
  }
  await supabaseBrowser().rpc('record_review', {
    p_word_id: wordId, p_grade: grade, p_correct: correct, p_stability: card.stability, p_difficulty: card.difficulty,
    p_due: card.due.toISOString(), p_state: card.state, p_response_ms: Math.round(responseMs), p_mode: mode, p_elapsed_days: elapsedDays,
  });
}

// ---------- XP / sessiya ----------
export interface XpResult { xp: number; level: number; leveled_up: boolean; streak: number; streak_event: string; freezes: number }

export async function addXp(amount: number, reason: string, meta: Record<string, unknown> = {}): Promise<XpResult | null> {
  if (amount <= 0) return null;
  if (isLocal()) return localAddXp(amount, reason);
  const { data, error } = await supabaseBrowser().rpc('add_xp', { p_amount: Math.round(amount), p_reason: reason, p_meta: meta });
  if (error) return null;
  return data as XpResult;
}

export async function finishSession(sessionId: string | null, mode: string, minutes: number, perfect: boolean) {
  if (isLocal()) {
    const db = loadLocal();
    const d = (db.daily[todayKey()] ??= { xp: 0, minutes: 0, reviews: 0, correct: 0, sessions: 0, modes: {} });
    d.minutes += minutes; d.sessions++; d.modes[mode] = (d.modes[mode] ?? 0) + 1;
    db.profile.interests[mode] = (db.profile.interests[mode] ?? 0) + 1;
    if (sessionId && db.sessions[sessionId]) db.sessions[sessionId].status = 'done';
    saveLocal(db);
    return;
  }
  await supabaseBrowser().rpc('finish_session', { p_session_id: sessionId, p_mode: mode, p_minutes: Math.round(minutes), p_perfect: perfect });
}

export async function createSession(mode: string, lessonId: number | null, state: unknown): Promise<string> {
  if (isLocal()) {
    const db = loadLocal();
    const id = uid('s');
    db.sessions[id] = { id, mode, lesson_id: lessonId, state, status: 'active', updated_at: new Date().toISOString() };
    saveLocal(db);
    return id;
  }
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return uid('s');
  // eski faol sessiyalarni yopish
  await sb.from('sessions').update({ status: 'abandoned' }).eq('user_id', auth.user.id).eq('mode', mode).eq('status', 'active');
  const { data } = await sb.from('sessions').insert({ user_id: auth.user.id, mode, lesson_id: lessonId, state }).select('id').maybeSingle();
  return data?.id ?? uid('s');
}

export async function saveSession(id: string, state: unknown, patch: { score?: number; total?: number; xp_earned?: number; duration_sec?: number } = {}) {
  if (isLocal()) {
    const db = loadLocal();
    if (db.sessions[id]) { db.sessions[id].state = state; db.sessions[id].updated_at = new Date().toISOString(); saveLocal(db); }
    return;
  }
  await supabaseBrowser().from('sessions').update({ state, updated_at: new Date().toISOString(), ...patch }).eq('id', id);
}

export async function fetchActiveSession(mode: string, lessonId?: number | null): Promise<{ id: string; state: unknown } | null> {
  if (isLocal()) {
    const s = Object.values(loadLocal().sessions).find((x) => x.mode === mode && x.status === 'active' && (lessonId === undefined || x.lesson_id === lessonId));
    return s ? { id: s.id, state: s.state } : null;
  }
  let q = supabaseBrowser().from('sessions').select('id, state').eq('mode', mode).eq('status', 'active').order('updated_at', { ascending: false }).limit(1);
  if (lessonId !== undefined && lessonId !== null) q = q.eq('lesson_id', lessonId);
  const { data } = await q.maybeSingle();
  return data ? { id: data.id, state: data.state } : null;
}

// ---------- Questlar, yutuqlar ----------
export async function fetchQuests(): Promise<(UserQuest & { quest: Quest })[]> {
  if (isLocal()) return [];
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const [{ data: quests }, { data: uq }] = await Promise.all([
    sb.from('quests').select('*').eq('is_active', true),
    sb.from('user_quests').select('*').eq('user_id', auth.user.id),
  ]);
  const today = todayKey();
  const { isoWeekKey } = await import('./utils');
  const week = isoWeekKey();
  const out: (UserQuest & { quest: Quest })[] = [];
  for (const q of (quests as Quest[]) ?? []) {
    const key = q.kind === 'daily' ? today : q.kind === 'weekly' ? week : 'once';
    const row = ((uq as UserQuest[]) ?? []).find((u) => u.quest_id === q.id && u.period_key === key);
    if (q.kind === 'once' && row?.claimed) continue;
    out.push({ ...(row ?? { id: 0, user_id: auth.user.id, quest_id: q.id, period_key: key, progress: 0, completed_at: null, claimed: false }), quest: q });
  }
  return out.sort((a, b) => (a.quest.kind === b.quest.kind ? 0 : a.quest.kind === 'daily' ? -1 : 1));
}

export async function claimQuest(userQuestId: number) {
  if (isLocal()) return null;
  const { data } = await supabaseBrowser().rpc('claim_quest', { p_user_quest_id: userQuestId });
  return data as { ok: boolean; xp?: XpResult } | null;
}

export async function checkAchievements(): Promise<{ code: string; title: string; icon: string; xp: number; rarity: string }[]> {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().rpc('check_achievements');
  return (data as { code: string; title: string; icon: string; xp: number; rarity: string }[]) ?? [];
}

// ---------- Statistika ----------
export interface UserStats {
  today: { xp: number; minutes: number; reviews: number; correct: number; sessions: number; modes: Record<string, number> } | null;
  heatmap: { day: string; xp: number; minutes: number; reviews: number }[];
  words: { new: number; learning: number; review: number; mastered: number; due: number; total_words: number };
  modes: Record<string, { total: number; correct: number }>;
  lessons: { completed: number; total: number };
  totals: { minutes: number; reviews: number; correct: number; sessions: number; active_days: number; duels_won: number; duels: number };
  recent_errors: { tr: string; uz: string; lapses: number }[];
  achievements: { code: string; title: string; icon: string; rarity: string; unlocked_at: string }[];
  rank: number;
}

export async function fetchStats(): Promise<UserStats | null> {
  if (isLocal()) return localStats() as UserStats;
  const { data } = await supabaseBrowser().rpc('get_user_stats');
  return (data as UserStats) ?? null;
}

export async function fetchLeaderboard(limit = 50) {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().from('leaderboard_weekly').select('*').limit(limit);
  return (data as { id: string; username: string; display_name: string | null; avatar: string; level: number; league: string; weekly_xp: number; xp: number; streak: number }[]) ?? [];
}

// ---------- AI ----------
export async function callAi<T = unknown>(kind: AiKind, payload: Record<string, unknown>): Promise<AiResponse<T>> {
  if (isLocal()) return { ok: false, reason: 'disabled', message: 'Demo rejimda AI mavjud emas. Supabase va AI kalitlarini sozlang.' };
  try {
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, payload }) });
    const json = (await res.json()) as AiResponse<T>;
    return json;
  } catch (e) {
    return { ok: false, reason: 'error', message: String((e as Error).message) };
  }
}

export async function fetchAiJobs() {
  if (isLocal()) return [];
  const { data } = await supabaseBrowser().from('ai_jobs').select('id, kind, status, result, error, created_at, payload')
    .or('status.neq.done,result.not.is.null').order('created_at', { ascending: false }).limit(20);
  return (data as { id: string; kind: AiKind; status: string; result: unknown; error: string | null; created_at: string; payload: Record<string, unknown> }[]) ?? [];
}

export async function signOut() {
  if (isLocal()) return;
  await supabaseBrowser().auth.signOut();
}
