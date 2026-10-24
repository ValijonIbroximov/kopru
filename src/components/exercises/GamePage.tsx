'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Exercise, GrammarTopic, SessionSummary, Word, AppSettings, Lesson, LessonProgress, UserWord } from '@/lib/types';
import { fetchWords, fetchGrammar, fetchLessonProgress, fetchActiveSession, fetchLessons, fetchUserWords } from '@/lib/data';
import { buildPool, getPoolMode, setPoolMode, nextLessonId, learnedWords, extendWords, type PoolMode } from '@/lib/wordpool';
import PoolBar from '@/components/games/PoolBar';
import { useProfile } from '@/components/AppShell';
import ExerciseRunner, { type RunnerState } from './ExerciseRunner';
import SessionEnd from './SessionEnd';
import { Skeleton } from '@/components/ui';
import HowToPlay, { hasSeenHowTo, type HowToStep } from '@/components/games/HowToPlay';
import { HelpCircle } from 'lucide-react';
import { useLang, type L } from '@/lib/i18n';

export interface GameContext {
  words: Word[];        // o'yin havzasi: o'rganilgan so'zlar (yoki foydalanuvchi tanlasa — yangi so'zlar bilan to'ldirilgan)
  allWords: Word[];
  grammar: GrammarTopic[];
  settings: AppSettings;
  lessons: Lesson[];
  progress: LessonProgress[];
  userWords: UserWord[];
}

interface Props {
  mode: string;
  title: L;
  icon: string;
  desc: L;
  build: (ctx: GameContext) => Exercise[] | Promise<Exercise[]>;
  bonusXp?: number;
  exitHref?: string;
  tips?: L[];
  howTo?: HowToStep[];
  /** O'yin uchun minimal so'z (havza paneli uchun); 0 — panel ko'rsatilmaydi (masalan, takrorlash) */
  minWords?: number;
}

/**
 * O'rganilgan so'zlar (boshlangan/yakunlangan darslar + SRS'da ko'rilganlar); `min` dan kam bo'lsa keyingi darslardan to'ldiriladi.
 * Chaqiriq/duel kabi "kafolatlangan hajm" kerak joylarda ishlatiladi. O'yinlar uchun GameShell/GamePage buildPool'dan foydalanadi.
 */
export function knownWords(all: Word[], lessons: Lesson[], progress: LessonProgress[], min = 24, userWords: UserWord[] = []): Word[] {
  return extendWords(learnedWords(all, progress, userWords), all, lessons, min);
}

export default function GamePage({ mode, title, icon, desc, build, bonusXp = 0, exitHref = '/play', tips = [], howTo, minWords = 8 }: Props) {
  const { settings } = useProfile();
  const { l, t } = useLang();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'running' | 'done'>('loading');
  const [showHow, setShowHow] = useState(false);
  const [ctx, setCtx] = useState<GameContext | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [resume, setResume] = useState<{ id: string; state: RunnerState } | null>(null);
  const [summary, setSummary] = useState<{ s: SessionSummary; id: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [poolMode, setPoolModeState] = useState<PoolMode>('known');
  const changeMode = (m: PoolMode) => {
    setPoolMode(m); setPoolModeState(m);
    setCtx((c) => (c ? { ...c, words: buildPool(c.allWords, c.lessons, c.progress, c.userWords, minWords, m).words } : c));
  };

  useEffect(() => {
    (async () => {
      try {
        const [allWords, grammar, progress, lessons, userWords, active] = await Promise.all([fetchWords(), fetchGrammar(), fetchLessonProgress(), fetchLessons(), fetchUserWords().catch(() => [] as UserWord[]), fetchActiveSession(mode)]);
        const pm = getPoolMode(); setPoolModeState(pm);
        const c: GameContext = { words: buildPool(allWords, lessons, progress, userWords, minWords, pm).words, allWords, grammar, settings, lessons, progress, userWords };
        setCtx(c);
        const st = active?.state as RunnerState | undefined;
        if (active && st && Array.isArray(st.queue) && st.queue.length && st.index < st.queue.length) setResume({ id: active.id, state: st });
        setPhase('ready');
        if (howTo?.length && !hasSeenHowTo(mode)) setShowHow(true);
      } catch (e) {
        setError(String((e as Error).message));
      }
    })();
  }, [mode, settings, minWords]);

  const start = useCallback(async (useResume: boolean) => {
    if (!ctx) return;
    if (useResume && resume) { setExercises(resume.state.queue); setPhase('running'); return; }
    const ex = await build(ctx);
    if (!ex.length) { setError(l({ uz: 'Bu rejim uchun hali yetarli so‘z yo‘q — avval 1–2 ta darsni o‘ting.', tr: 'Bu mod için henüz yeterli kelime yok — önce 1–2 ders tamamlayın.' })); return; }
    setResume(null);
    setExercises(ex);
    setPhase('running');
  }, [ctx, resume, build]);

  if (error) return <div className="mx-auto max-w-xl"><div className="card p-6 text-center"><div className="text-3xl">🙈</div><p className="mt-2 text-ink-200">{error}</p><Link href="/learn" className="btn-primary mt-4">{l({ uz: 'Darslarga o‘tish', tr: 'Derslere git' })}</Link></div></div>;
  if (phase === 'loading' || !ctx) return <div className="mx-auto max-w-xl space-y-3"><Skeleton className="h-40" /><Skeleton className="h-12" /></div>;

  if (phase === 'ready') {
    const pool = buildPool(ctx.allWords, ctx.lessons, ctx.progress, ctx.userWords, minWords, poolMode);
    const blocked = minWords > 0 && !pool.enough;
    return (
      <div className="mx-auto max-w-xl animate-pop">
        {howTo && <HowToPlay id={mode} title={title} steps={howTo} open={showHow} onDone={() => setShowHow(false)} />}
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] opacity-10 blur-[1px]">{icon}</div>
          <div className="text-5xl">{icon}</div>
          <h1 className="title mt-3">{l(title)}</h1>
          <p className="subtitle mt-1">{l(desc)}</p>
          {minWords > 0 ? <PoolBar pool={pool} mode={poolMode} onMode={changeMode} minWords={minWords} nextLesson={nextLessonId(ctx.lessons, ctx.progress)} /> : <div className="mt-3 text-xs text-ink-400">{t('known_words')}: {pool.known.length} · {l({ uz: 'so‘z bazasi', tr: 'kelime havuzu' })}: {ctx.allWords.length}</div>}
          {tips.length > 0 && <ul className="mt-4 space-y-1 text-sm text-ink-200">{tips.map((x, i) => <li key={i}>• {l(x)}</li>)}</ul>}
          <div className="mt-6 grid gap-2">
            {resume && <button className="btn-primary" onClick={() => start(true)}>{l({ uz: 'Davom ettirish', tr: 'Devam et' })} ({resume.state.index}/{resume.state.queue.length}) →</button>}
            <button className={resume ? 'btn-secondary' : 'btn-primary py-4 text-base'} onClick={() => start(false)} disabled={blocked}>{resume ? l({ uz: 'Yangidan boshlash', tr: 'Yeniden başla' }) : t('start')}</button>
            <div className="flex gap-2">
              {howTo && <button className="btn-secondary flex-1" onClick={() => setShowHow(true)}><HelpCircle size={16} /> {t('how_to_play')}</button>}
              <Link href={exitHref} className="btn-ghost flex-1">{t('back')}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done' && summary) {
    const wrongIds = new Set(summary.s.results.filter((r) => !r.correct && r.wordId).map((r) => r.wordId));
    const mistakes = ctx.allWords.filter((w) => wrongIds.has(w.id)).map((w) => ({ tr: w.tr, uz: w.uz }));
    return <SessionEnd summary={summary.s} sessionId={summary.id} bonusXp={bonusXp} mistakes={mistakes} nextHref={exitHref} nextLabel={t('games')} onRetry={() => { setSummary(null); start(false); }} />;
  }

  return (
    <ExerciseRunner key={resume?.id ?? exercises[0]?.id} exercises={exercises} mode={mode} title={l(title)} exitHref={exitHref} resume={resume}
      onFinish={(s, id) => { setSummary({ s, id }); setPhase('done'); }} />
  );
}
