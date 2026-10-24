'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Exercise, GrammarTopic, SessionSummary, Word, AppSettings, Lesson, LessonProgress } from '@/lib/types';
import { fetchWords, fetchGrammar, fetchLessonProgress, fetchActiveSession, fetchLessons } from '@/lib/data';
import { useProfile } from '@/components/AppShell';
import ExerciseRunner, { type RunnerState } from './ExerciseRunner';
import SessionEnd from './SessionEnd';
import { Skeleton } from '@/components/ui';
import HowToPlay, { hasSeenHowTo, type HowToStep } from '@/components/games/HowToPlay';
import { HelpCircle } from 'lucide-react';

export interface GameContext {
  words: Word[];        // tanish so'zlar (boshlangan darslardan)
  allWords: Word[];
  grammar: GrammarTopic[];
  settings: AppSettings;
  lessons: Lesson[];
  progress: LessonProgress[];
}

interface Props {
  mode: string;
  title: string;
  icon: string;
  desc: string;
  build: (ctx: GameContext) => Exercise[] | Promise<Exercise[]>;
  bonusXp?: number;
  exitHref?: string;
  tips?: string[];
  howTo?: HowToStep[];
}

/** Boshlangan darslardagi so'zlar; kam bo'lsa — birinchi darslar bilan to'ldiradi */
export function knownWords(all: Word[], lessons: Lesson[], progress: LessonProgress[], min = 24): Word[] {
  const started = new Set(progress.filter((p) => p.status !== 'locked').map((p) => p.lesson_id));
  let known = all.filter((w) => w.lesson_id && started.has(w.lesson_id));
  if (known.length < min) {
    const order = lessons.slice().sort((a, b) => a.unit_id - b.unit_id || a.order_index - b.order_index);
    for (const l of order) {
      if (known.length >= min) break;
      if (started.has(l.id)) continue;
      known = known.concat(all.filter((w) => w.lesson_id === l.id));
    }
  }
  return known;
}

export default function GamePage({ mode, title, icon, desc, build, bonusXp = 0, exitHref = '/play', tips = [], howTo }: Props) {
  const { settings } = useProfile();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'running' | 'done'>('loading');
  const [showHow, setShowHow] = useState(false);
  const [ctx, setCtx] = useState<GameContext | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [resume, setResume] = useState<{ id: string; state: RunnerState } | null>(null);
  const [summary, setSummary] = useState<{ s: SessionSummary; id: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [allWords, grammar, progress, lessons, active] = await Promise.all([fetchWords(), fetchGrammar(), fetchLessonProgress(), fetchLessons(), fetchActiveSession(mode)]);
        const c: GameContext = { words: knownWords(allWords, lessons, progress), allWords, grammar, settings, lessons, progress };
        setCtx(c);
        const st = active?.state as RunnerState | undefined;
        if (active && st && Array.isArray(st.queue) && st.queue.length && st.index < st.queue.length) setResume({ id: active.id, state: st });
        setPhase('ready');
        if (howTo?.length && !hasSeenHowTo(mode)) setShowHow(true);
      } catch (e) {
        setError(String((e as Error).message));
      }
    })();
  }, [mode, settings]);

  const start = useCallback(async (useResume: boolean) => {
    if (!ctx) return;
    if (useResume && resume) { setExercises(resume.state.queue); setPhase('running'); return; }
    const ex = await build(ctx);
    if (!ex.length) { setError('Bu rejim uchun hali yetarli so‘z yo‘q — avval 1–2 ta darsni o‘ting.'); return; }
    setResume(null);
    setExercises(ex);
    setPhase('running');
  }, [ctx, resume, build]);

  if (error) return <div className="mx-auto max-w-xl"><div className="card p-6 text-center"><div className="text-3xl">🙈</div><p className="mt-2 text-ink-200">{error}</p><Link href="/learn" className="btn-primary mt-4">Darslarga o‘tish</Link></div></div>;
  if (phase === 'loading' || !ctx) return <div className="mx-auto max-w-xl space-y-3"><Skeleton className="h-40" /><Skeleton className="h-12" /></div>;

  if (phase === 'ready') {
    return (
      <div className="mx-auto max-w-xl animate-pop">
        {howTo && <HowToPlay id={mode} title={title} steps={howTo} open={showHow} onDone={() => setShowHow(false)} />}
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 select-none text-[120px] opacity-10 blur-[1px]">{icon}</div>
          <div className="text-5xl">{icon}</div>
          <h1 className="title mt-3">{title}</h1>
          <p className="subtitle mt-1">{desc}</p>
          <div className="mt-3 text-xs text-ink-400">Tanish so‘zlar: {ctx.words.length} · so‘z bazasi: {ctx.allWords.length}</div>
          {tips.length > 0 && <ul className="mt-4 space-y-1 text-sm text-ink-200">{tips.map((t, i) => <li key={i}>• {t}</li>)}</ul>}
          <div className="mt-6 grid gap-2">
            {resume && <button className="btn-primary" onClick={() => start(true)}>Davom ettirish ({resume.state.index}/{resume.state.queue.length}) →</button>}
            <button className={resume ? 'btn-secondary' : 'btn-primary py-4 text-base'} onClick={() => start(false)}>{resume ? 'Yangidan boshlash' : 'Boshlash →'}</button>
            <div className="flex gap-2">
              {howTo && <button className="btn-secondary flex-1" onClick={() => setShowHow(true)}><HelpCircle size={16} /> Qanday o‘ynaladi</button>}
              <Link href={exitHref} className="btn-ghost flex-1">Orqaga</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done' && summary) {
    const wrongIds = new Set(summary.s.results.filter((r) => !r.correct && r.wordId).map((r) => r.wordId));
    const mistakes = ctx.allWords.filter((w) => wrongIds.has(w.id)).map((w) => ({ tr: w.tr, uz: w.uz }));
    return <SessionEnd summary={summary.s} sessionId={summary.id} bonusXp={bonusXp} mistakes={mistakes} nextHref={exitHref} nextLabel="O‘yinlar" onRetry={() => { setSummary(null); start(false); }} />;
  }

  return (
    <ExerciseRunner key={resume?.id ?? exercises[0]?.id} exercises={exercises} mode={mode} title={title} exitHref={exitHref} resume={resume}
      onFinish={(s, id) => { setSummary({ s, id }); setPhase('done'); }} />
  );
}
