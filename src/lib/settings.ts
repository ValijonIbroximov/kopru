import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  xp: { correct: 2, streak_bonus: 1, lesson: 30, boss: 60, perfect_bonus: 15, review_session: 10, duel_win: 40, duel_lose: 10, story: 20, tutor_turn: 3, exam: 50, comeback_multiplier: 2 },
  goals: { options: [5, 10, 15, 20, 30], default: 10 },
  srs: { desired_retention: 0.9, max_new_per_day: 20, max_reviews_per_session: 25, mastered_stability_days: 21 },
  flow: { target_accuracy: 0.82, min_accuracy: 0.65, max_accuracy: 0.93, session_min_items: 8, session_max_items: 20 },
  features: { duel: true, story: true, tutor: true, speak: true, listen: true, exam: true, leaderboard: true, cognates: true, harmony: true },
  motivation: { risk_days: 2, comeback_days: 3, nudge_after_wrong_streak: 3, variety_rotation: true },
  ai: { enabled: true, daily_user_cap: 40, story_words: 120, tutor_max_turns: 12, cache_ttl_days: 30, queue_enabled: true },
  exam: { listening: 8, reading: 8, writing: 2, speaking: 3, time_min: 25 },
};

export async function loadSettings(sb: SupabaseClient): Promise<AppSettings> {
  try {
    const { data } = await sb.from('app_settings').select('key, value');
    const s: AppSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    for (const row of data ?? []) {
      const k = row.key as keyof AppSettings;
      if (k in s && row.value && typeof row.value === 'object') {
        (s as unknown as Record<string, unknown>)[k] = { ...(s[k] as object), ...(row.value as object) };
      }
    }
    return s;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
