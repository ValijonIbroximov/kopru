import type { SupabaseClient } from '@supabase/supabase-js';

/** Authenticated database state, never the level/word list supplied by the browser. */
export async function learnerContext(sb: SupabaseClient, userId: string) {
  const [profile, progress, states] = await Promise.all([
    sb.from('profiles').select('level_cefr, daily_goal_min').eq('id', userId).maybeSingle(),
    sb.from('lesson_progress').select('lesson_id, status').eq('user_id', userId).eq('status', 'completed').limit(300),
    sb.from('user_words').select('word_id, lapses, reps, due, last_review').eq('user_id', userId).neq('state', 'new').order('last_review', { ascending: false }).limit(500),
  ]);
  if (profile.error || progress.error || states.error) throw new Error('O‘quv tarixi yuklanmadi. Qayta urinib ko‘ring.');
  const state = states.data ?? [];
  const ids = state.map(s => s.word_id);
  const vocabulary = ids.length ? await sb.from('words').select('id, tr, uz').in('id', ids) : { data: [], error: null };
  if (vocabulary.error) throw new Error('Lug‘at yuklanmadi.');
  const byId = new Map((vocabulary.data ?? []).map(w => [w.id, w]));
  const weak = state.filter(s => s.lapses > 0).sort((a,b) => b.lapses - a.lapses).slice(0, 12).map(s => byId.get(s.word_id)).filter(Boolean);
  const known = (vocabulary.data ?? []).slice(0, 160).map(w => ({ tr: w.tr, uz: w.uz }));
  return { level: profile.data?.level_cefr ?? 'A1', dailyMinutes: profile.data?.daily_goal_min ?? 15,
    completedLessons: (progress.data ?? []).map(p => p.lesson_id), known, weak,
    knownCount: state.length, policy: 'teach-before-test-v2' };
}
