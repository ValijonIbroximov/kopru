'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Flame } from 'lucide-react';
import type { Exercise, ExerciseResult, SessionSummary, UserWord } from '@/lib/types';
import { cardFromRow, gradeFromResult, schedule } from '@/lib/fsrs';
import { fetchUserWords, recordReview, saveSession, createSession } from '@/lib/data';
import { useProfile } from '@/components/AppShell';
import { Bar, Confetti } from '@/components/ui';
import { ENCOURAGE, CONSOLE } from '@/lib/motivation';
import { cn } from '@/lib/utils';
import { speak } from '@/lib/speech';
import { useLang } from '@/lib/i18n';
import {
  IntroView, ChoiceView, TypingView, MatchView, OrderView, ListenView, SpeakView, HarmonyView, FillView, TrueFalseView,
} from './ExerciseViews';

export interface RunnerState {
  queue: Exercise[];
  index: number;
  results: ExerciseResult[];
  requeued: string[];
  startedAt: number;
}

interface Props {
  exercises: Exercise[];
  mode: string;
  lessonId?: number | null;
  title?: string;
  exitHref?: string;
  resume?: { id: string; state: RunnerState } | null;
  onFinish: (summary: SessionSummary, sessionId: string | null) => void;
  requeueWrong?: boolean;
}

export default function ExerciseRunner({ exercises, mode, lessonId = null, title, exitHref = '/dashboard', resume, onFinish, requeueWrong = true }: Props) {
  const router = useRouter();
  const { settings } = useProfile();
  const { t, l } = useLang();
  const [state, setState] = useState<RunnerState>(() => resume?.state ?? { queue: exercises, index: 0, results: [], requeued: [], startedAt: Date.now() });
  const [sessionId, setSessionId] = useState<string | null>(resume?.id ?? null);
  const [answered, setAnswered] = useState<{ correct: boolean; detail?: string } | null>(null);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);
  const cardsRef = useRef<Map<number, UserWord>>(new Map());
  const shownAt = useRef(Date.now());
  const finishingRef = useRef(false);

  const current = state.queue[state.index];
  const total = state.queue.length;
  const pct = total ? (state.index / total) * 100 : 0;

  // sessiya yaratish + SRS holatini yuklash
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uw = await fetchUserWords();
      if (!cancelled) cardsRef.current = new Map(uw.map((w) => [w.word_id, w]));
      if (!sessionId && !cancelled) {
        const id = await createSession(mode, lessonId, state);
        if (!cancelled) setSessionId(id);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { shownAt.current = Date.now(); }, [state.index]);

  const xpPerCorrect = settings.xp.correct ?? 2;

  const handleAnswer = useCallback(async (correct: boolean, meta?: { usedHint?: boolean; detail?: string; pairResults?: { wordId?: number; correct: boolean }[]; skipped?: boolean }) => {
    if (!current || answered) return;
    const responseMs = Date.now() - shownAt.current;
    const scored = !meta?.skipped && current.type !== 'intro';
    setAnswered({ correct, detail: meta?.detail });
    let earned = 0;
    if (scored) {
      if (correct) {
        const c = combo + 1;
        setCombo(c);
        earned = xpPerCorrect + (c >= 3 ? settings.xp.streak_bonus ?? 1 : 0);
        setXp((x) => x + earned);
      } else setCombo(0);
    }
    const result: ExerciseResult = { exerciseId: current.id, type: current.type, wordId: current.wordId, correct: scored ? correct : true, responseMs, usedHint: meta?.usedHint };

    // SRS yozuvlari
    const reviewTargets: { wordId: number; correct: boolean }[] = [];
    if (current.type === 'match' && meta?.pairResults) for (const p of meta.pairResults) if (p.wordId) reviewTargets.push({ wordId: p.wordId, correct: p.correct });
    else if (scored && current.wordId) reviewTargets.push({ wordId: current.wordId, correct });
    for (const t of reviewTargets) {
      const prev = cardsRef.current.get(t.wordId);
      const card = cardFromRow(prev);
      const grade = gradeFromResult(t.correct, responseMs, meta?.usedHint, current.type);
      const { card: next, elapsedDays } = schedule(card, grade, new Date(), settings.srs.desired_retention);
      cardsRef.current.set(t.wordId, { user_id: prev?.user_id ?? '', word_id: t.wordId, stability: next.stability, difficulty: next.difficulty, due: next.due.toISOString(), reps: next.reps, lapses: next.lapses, state: next.state, last_review: new Date().toISOString() });
      recordReview(t.wordId, grade, t.correct, next, responseMs, mode, elapsedDays).catch(() => {});
    }

    setState((s) => {
      const results = [...s.results, result];
      let queue = s.queue;
      let requeued = s.requeued;
      const isCopy = current.id.endsWith('_r');
      if (!correct && scored && requeueWrong && !isCopy && !s.requeued.includes(current.id) && current.type !== 'match' && current.type !== 'speak') {
        // xato javob — bir marta (faqat bir marta) sessiya oxiriga qayta qo'shiladi
        queue = [...s.queue, { ...current, id: current.id + '_r' }];
        requeued = [...s.requeued, current.id];
      }
      const ns = { ...s, results, queue, requeued };
      if (sessionId) saveSession(sessionId, ns, { score: results.filter((r) => r.correct).length, total: queue.length, xp_earned: xp + earned }).catch(() => {});
      return ns;
    });
  }, [current, answered, combo, xpPerCorrect, settings, mode, sessionId, xp, requeueWrong]);

  const next = useCallback(() => {
    if (!current) return;
    setAnswered(null);
    if (state.index + 1 >= state.queue.length) {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setFinished(true);
      const scoredResults = state.results.filter((r) => r.type !== 'intro');
      const correct = scoredResults.filter((r) => r.correct).length;
      const summary: SessionSummary = {
        mode, correct, total: scoredResults.length, xp, durationSec: Math.round((Date.now() - state.startedAt) / 1000),
        perfect: scoredResults.length > 0 && correct === scoredResults.length, results: state.results,
      };
      onFinish(summary, sessionId);
      return;
    }
    setState((s) => ({ ...s, index: s.index + 1 }));
  }, [current, state, mode, xp, onFinish, sessionId]);

  // Enter → davom etish
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Enter' && answered) { e.preventDefault(); next(); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [answered, next]);

  const feedbackMsg = useMemo(() => {
    if (!answered) return '';
    const arr = answered.correct ? ENCOURAGE : CONSOLE;
    return l(arr[Math.floor(Math.random() * arr.length)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  if (!current || finished) return <div className="mx-auto max-w-xl py-10 text-center text-ink-300">{t('finishing')}</div>;

  const view = (() => {
    const p = { onAnswer: handleAnswer, answered: Boolean(answered) };
    switch (current.type) {
      case 'intro': return <IntroView ex={current} {...p} />;
      case 'choice': return <ChoiceView key={current.id} ex={current} {...p} />;
      case 'typing': return <TypingView key={current.id} ex={current} {...p} />;
      case 'match': return <MatchView key={current.id} ex={current} {...p} />;
      case 'order': return <OrderView key={current.id} ex={current} {...p} />;
      case 'listen': return <ListenView key={current.id} ex={current} {...p} />;
      case 'speak': return <SpeakView key={current.id} ex={current} {...p} />;
      case 'harmony': return <HarmonyView key={current.id} ex={current} {...p} />;
      case 'fill': return <FillView key={current.id} ex={current} {...p} />;
      case 'truefalse': return <TrueFalseView key={current.id} ex={current} {...p} />;
    }
  })();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-xl flex-col">
      <Confetti run={Boolean(answered?.correct && combo > 0 && combo % 5 === 0)} />
      <div className="mb-4 flex items-center gap-3">
        <button className="btn-ghost -ml-2 px-2 py-2" onClick={() => router.push(exitHref)} title={t('exit_saved')}><X size={20} /></button>
        <Bar value={pct} color="bg-gradient-to-r from-ember-500 to-rose-500" className="h-3" />
        <div className={cn('flex items-center gap-1 text-sm font-bold', combo >= 3 ? 'text-ember-400' : 'text-ink-400')}><Flame size={16} /> {combo}</div>
        <div className="text-sm font-bold text-gold-300">+{xp}</div>
      </div>
      {title && <div className="mb-3 text-xs text-ink-400">{title} · {state.index + 1}/{total}</div>}

      <div key={current.id} className="animate-pop flex-1">{view}</div>

      {answered && (
        <div className={cn('sticky bottom-0 -mx-4 mt-4 border-t px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:-mx-6 sm:px-6', answered.correct ? 'border-teal-400/30 bg-teal-500/10' : 'border-rose-500/30 bg-rose-500/10')}>
          <div className="mx-auto max-w-xl">
            <div className={cn('font-display text-lg font-bold', answered.correct ? 'text-teal-300' : 'text-rose-300')}>{answered.correct ? '✓ ' : '✗ '}{feedbackMsg}</div>
            {answered.detail && <div className="mt-1 text-sm text-ink-100">{answered.detail}</div>}
            {current.explain && current.type !== 'intro' && (
              <div className="mt-1 flex items-start gap-2 text-sm text-ink-200">
                {/* misol jumlasi (turkcha qismi) — eshitish */}
                {/^[^—]+ — /.test(current.explain) && <button type="button" className="chip shrink-0 py-0.5 text-teal-300" title="🔊" onClick={() => speak(current.explain!.split(' — ')[0])}>🔊</button>}
                <span>{current.explain}</span>
              </div>
            )}
            {!answered.correct && current.type !== 'intro' && 'tts' in current && current.tts && (
              <button className="mt-1 text-xs text-ink-300 underline" onClick={() => speak(String(current.tts))}>🔊 {t('listen').toLowerCase()}</button>
            )}
            <button className={cn('btn mt-3 w-full text-base', answered.correct ? 'btn-teal' : 'bg-rose-500 text-white')} onClick={next}>
              {state.index + 1 >= total ? t('finish') : t('continue')} <span className="kbd ml-1 hidden sm:inline">Enter</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
