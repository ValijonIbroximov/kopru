// ===== Ma'lumotlar bazasi qatorlari =====
export type Role = 'user' | 'admin';
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type League = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar: string;
  role: Role;
  level_cefr: Cefr;
  xp: number;
  level: number;
  weekly_xp: number;
  league: League;
  streak: number;
  best_streak: number;
  streak_freezes: number;
  last_active_date: string | null;
  daily_goal_min: number;
  tz: string;
  interests: Record<string, number>;
  settings: Record<string, unknown>;
  onboarded: boolean;
  banned: boolean;
  created_at: string;
}

export interface Unit {
  id: number;
  slug: string;
  title_uz: string;
  title_tr: string | null;
  description: string | null;
  cefr: Cefr;
  order_index: number;
  icon: string;
  color: string;
  is_published: boolean;
}

export type LessonKind = 'vocab' | 'grammar' | 'dialog' | 'culture' | 'boss' | 'cognates';

export interface DialogLine { who: string; tr: string; uz: string }

export interface LessonContent {
  intro?: string;
  tip?: string;
  hook?: string;
  dialog?: DialogLine[];
}

export interface Lesson {
  id: number;
  unit_id: number;
  slug: string;
  title_uz: string;
  title_tr: string | null;
  kind: LessonKind;
  order_index: number;
  content: LessonContent;
  xp_reward: number;
  is_published: boolean;
}

export interface Word {
  id: number;
  lesson_id: number | null;
  tr: string;
  uz: string;
  pos: string | null;
  example_tr: string | null;
  example_uz: string | null;
  cognate: string | null;
  false_friend: boolean;
  tags: string[];
  difficulty: number;
  cefr: Cefr;
}

export interface GrammarDrill {
  sentence: string;
  answer: string;
  options: string[];
  explain?: string;
}

export interface GrammarTopic {
  id: number;
  lesson_id: number | null;
  code: string;
  title_uz: string;
  title_tr: string | null;
  cefr: Cefr;
  explanation_md: string;
  rules: Record<string, unknown>;
  drills: GrammarDrill[];
  order_index: number;
}

export type WordState = 'new' | 'learning' | 'review' | 'relearning';

export interface UserWord {
  user_id: string;
  word_id: number;
  stability: number;
  difficulty: number;
  due: string;
  reps: number;
  lapses: number;
  state: WordState;
  last_review: string | null;
}

export interface LessonProgress {
  user_id: string;
  lesson_id: number;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  best_score: number;
  stars: number;
  attempts: number;
  completed_at: string | null;
}

export interface Quest {
  id: number;
  code: string;
  title_uz: string;
  description_uz: string | null;
  kind: 'daily' | 'weekly' | 'once';
  metric: string;
  target: number;
  xp_reward: number;
  icon: string;
  is_active: boolean;
}

export interface UserQuest {
  id: number;
  user_id: string;
  quest_id: number;
  period_key: string;
  progress: number;
  completed_at: string | null;
  claimed: boolean;
  quest?: Quest;
}

export interface Achievement {
  id: number;
  code: string;
  title_uz: string;
  description_uz: string | null;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  condition: { metric: string; gte: number };
  xp_reward: number;
  is_active: boolean;
}

export interface Duel {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'playing' | 'done' | 'cancelled';
  questions: Exercise[];
  host_score: number;
  guest_score: number;
  winner_id: string | null;
  created_at: string;
}

export interface AiProviderState {
  provider: string;
  enabled: boolean;
  priority: number;
  model: string | null;
  daily_cap: number;
  used_today: number;
  day: string;
  cooldown_until: string | null;
  last_error: string | null;
  total_calls: number;
  total_errors: number;
  avg_latency_ms: number | null;
}

export interface AiJob {
  id: string;
  user_id: string | null;
  kind: AiKind;
  payload: Record<string, unknown>;
  status: 'queued' | 'running' | 'done' | 'failed';
  result: unknown;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

// ===== AI =====
export type AiKind = 'story' | 'tutor' | 'explain' | 'exercises' | 'feedback' | 'exam_writing' | 'translate';

export interface AiResult<T = unknown> {
  ok: true;
  data: T;
  provider: string;
  cached: boolean;
  model?: string;
}
export interface AiFailure {
  ok: false;
  reason: 'quota' | 'disabled' | 'error' | 'unauthorized' | 'invalid';
  message: string;
  retryAt?: string | null;
  queued?: boolean;
  jobId?: string;
  /** Texnik qisqa izoh (qaysi provayderlar sozlangan, nechta model sinaldi) — UI da kichik matn */
  detail?: string;
}
export type AiResponse<T = unknown> = AiResult<T> | AiFailure;

export interface StoryData {
  title_tr: string;
  title_uz: string;
  level: string;
  paragraphs: { tr: string; uz: string }[];
  glossary: { tr: string; uz: string }[];
  questions: { q: string; options: string[]; answer: number; explain?: string }[];
}

// ===== Mashqlar =====
export type ExerciseType =
  | 'intro'
  | 'choice'
  | 'typing'
  | 'match'
  | 'order'
  | 'listen'
  | 'speak'
  | 'harmony'
  | 'fill'
  | 'truefalse';

export interface ExerciseBase {
  id: string;
  type: ExerciseType;
  wordId?: number;
  skill?: 'vocab' | 'grammar' | 'listening' | 'speaking' | 'reading' | 'writing';
  explain?: string;
}

export interface IntroExercise extends ExerciseBase {
  type: 'intro';
  tr: string;
  uz: string;
  example_tr?: string | null;
  example_uz?: string | null;
  cognate?: string | null;
  false_friend?: boolean;
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  prompt: string;
  promptSub?: string;
  options: string[];
  answer: number;
  tts?: string;
}

export interface TypingExercise extends ExerciseBase {
  type: 'typing';
  prompt: string;
  promptSub?: string;
  answer: string;
  accept?: string[];
  tts?: string;
}

export interface MatchExercise extends ExerciseBase {
  type: 'match';
  pairs: { a: string; b: string; wordId?: number }[];
}

export interface OrderExercise extends ExerciseBase {
  type: 'order';
  prompt: string;
  answer: string[];
  tokens: string[];
  tts?: string;
}

export interface ListenExercise extends ExerciseBase {
  type: 'listen';
  tts: string;
  answer: string;
  options?: string[];
  translation?: string;
}

export interface SpeakExercise extends ExerciseBase {
  type: 'speak';
  text: string;
  translation: string;
}

export interface HarmonyExercise extends ExerciseBase {
  type: 'harmony';
  stem: string;
  stemUz: string;
  suffixLabel: string;
  answer: string;
  options: string[];
  rule: string;
}

export interface FillExercise extends ExerciseBase {
  type: 'fill';
  sentence: string;
  answer: string;
  options: string[];
}

export interface TrueFalseExercise extends ExerciseBase {
  type: 'truefalse';
  statement: string;
  sub?: string;
  answer: boolean;
}

export type Exercise =
  | IntroExercise
  | ChoiceExercise
  | TypingExercise
  | MatchExercise
  | OrderExercise
  | ListenExercise
  | SpeakExercise
  | HarmonyExercise
  | FillExercise
  | TrueFalseExercise;

export interface ExerciseResult {
  exerciseId: string;
  type: ExerciseType;
  wordId?: number;
  correct: boolean;
  responseMs: number;
  usedHint?: boolean;
}

export interface SessionSummary {
  mode: string;
  correct: number;
  total: number;
  xp: number;
  durationSec: number;
  perfect: boolean;
  results: ExerciseResult[];
}

export interface AppSettings {
  xp: Record<string, number>;
  goals: { options: number[]; default: number };
  srs: { desired_retention: number; max_new_per_day: number; max_reviews_per_session: number; mastered_stability_days: number };
  flow: { target_accuracy: number; min_accuracy: number; max_accuracy: number; session_min_items: number; session_max_items: number };
  features: Record<string, boolean>;
  motivation: { risk_days: number; comeback_days: number; nudge_after_wrong_streak: number; variety_rotation: boolean };
  ai: { enabled: boolean; daily_user_cap: number; story_words: number; tutor_max_turns: number; cache_ttl_days: number; queue_enabled: boolean };
  exam: { listening: number; reading: number; writing: number; speaking: number; time_min: number };
}
