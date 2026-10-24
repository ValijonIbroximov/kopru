'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, HelpCircle, Trophy } from 'lucide-react';
import type { Word, GrammarTopic, Lesson, LessonProgress, SessionSummary } from '@/lib/types';
import { fetchWords, fetchGrammar, fetchLessonProgress, fetchLessons, finishSession, addXp, checkAchievements, type XpResult } from '@/lib/data';
import { knownWords } from '@/components/exercises/GamePage';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { Skeleton, Confetti, ProgressRing } from '@/components/ui';
import HowToPlay, { hasSeenHowTo, type HowToStep } from './HowToPlay';
import { submitScore, fetchMyBest, fetchHighScores, type HighScore } from '@/lib/social';
import { cn } from '@/lib/utils';

export interface GameData { words: Word[]; allWords: Word[]; grammar: GrammarTopic[]; lessons: Lesson[]; progress: LessonProgress[] }

export interface GameResult {
  score: number;            // o'yin bali (rekord uchun)
  correct: number;
  total: number;
  xp: number;               // beriladigan XP
  durationSec: number;
  perfect?: boolean;
  details?: { label: string; value: string | number }[];
  mistakes?: { tr: string; uz: string }[];
}

interface Props {
  id: string;                     // mode/game id (rekord kaliti)
  title: string;
  icon: string;
  desc: string;
  howTo: HowToStep[];
  minWords?: number;
  /** O'yin komponenti: data va onEnd beriladi */
  children: (data: GameData, onEnd: (r: GameResult) => void, api: { exit: () => void }) => React.ReactNode;
  scoreKey?: string;              // rekord kaliti (default id)
  exitHref?: string;
  headerExtra?: React.ReactNode;
  autoStart?: boolean;
}

export default function GameShell({ id, title, icon, desc, howTo, minWords = 12, children, scoreKey, exitHref = '/play', headerExtra, autoStart = false }: Props) {
  const router = useRouter();
  const { settings, refresh } = useProfile();
  const { push } = useToast();
  const [data, setData] = useState<GameData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'playing' | 'end'>('loading');
  const [showHow, setShowHow] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [rank, setRank] = useState<{ best: boolean; rank: number } | null>(null);
  const [xpRes, setXpRes] = useState<XpResult | null>(null);
  const [top, setTop] = useState<HighScore[]>([]);
  const [runKey, setRunKey] = useState(0);
  const key = scoreKey ?? id;
  const saving = useRef(false);

  useEffect(() => {
    (async () => {
      const [allWords, grammar, progress, lessons, b, t] = await Promise.all([fetchWords(), fetchGrammar(), fetchLessonProgress(), fetchLessons(), fetchMyBest(key), fetchHighScores(key, 5)]);
      setData({ words: knownWords(allWords, lessons, progress, Math.max(minWords, 24)), allWords, grammar, lessons, progress });
      setBest(b); setTop(t);
      setPhase('ready');
      if (!hasSeenHowTo(id)) setShowHow(true);
      else if (autoStart) setPhase('playing');
    })();
  }, [id, key, minWords, autoStart]);

  async function onEnd(r: GameResult) {
    if (saving.current) return;
    saving.current = true;
    setResult(r); setPhase('end');
    try {
      await finishSession(null, id, Math.max(1, Math.round(r.durationSec / 60)), Boolean(r.perfect));
      const sc = await submitScore(key, r.score, { correct: r.correct, total: r.total });
      setRank({ best: sc.best, rank: sc.rank });
      if (sc.best && (sc.prev ?? 0) > 0) push({ kind: 'achievement', icon: '🏅', title: 'Yangi rekord!', body: `${r.score} (oldingi ${sc.prev})` });
      if (r.xp > 0) {
        const xr = await addXp(r.xp, id, { score: r.score });
        setXpRes(xr);
        if (xr?.leveled_up) push({ kind: 'xp', icon: '🆙', title: `${xr.level}-daraja!` });
        if (xr?.streak_event === 'start' || xr?.streak_event === 'extended') push({ kind: 'xp', icon: '🔥', title: `${xr.streak} kunlik streak` });
      }
      const ach = await checkAchievements();
      for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `Yutuq: ${a.title}`, body: `+${a.xp} XP` });
      setBest(Math.max(best ?? 0, r.score));
      setTop(await fetchHighScores(key, 5));
      await refresh();
    } finally { saving.current = false; }
  }

  const start = () => { setRunKey((k) => k + 1); setResult(null); setRank(null); setXpRes(null); setPhase('playing'); };

  if (phase === 'loading' || !data) return <div className="mx-auto max-w-xl space-y-3"><Skeleton className="h-40" /><Skeleton className="h-12" /></div>;

  if (phase === 'ready') {
    const enough = data.words.length >= minWords;
    return (
      <div className="mx-auto max-w-xl animate-pop">
        <HowToPlay id={id} title={title} steps={howTo} open={showHow} onDone={() => setShowHow(false)} />
        <div className="card overflow-hidden">
          <div className="relative p-6">
            <div className="absolute -right-6 -top-6 text-[120px] opacity-10 blur-[1px] select-none">{icon}</div>
            <div className="text-5xl">{icon}</div>
            <h1 className="title mt-3">{title}</h1>
            <p className="subtitle mt-1">{desc}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="chip">📚 {data.words.length} tanish so‘z</span>
              {best !== null && <span className="chip text-gold-300"><Trophy size={12} /> Rekordingiz: {best}</span>}
              {headerExtra}
            </div>
            {!enough && <div className="mt-4 rounded-2xl bg-gold-400/10 p-3 text-sm text-gold-200">Bu o‘yin uchun kamida {minWords} ta so‘z kerak — avval 1–2 ta darsni o‘ting. (Hozircha boshlang‘ich so‘zlar bilan o‘ynaysiz.)</div>}
            <div className="mt-6 grid gap-2">
              <button className="btn-primary py-4 text-base" onClick={start}>Boshlash →</button>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setShowHow(true)}><HelpCircle size={16} /> Qanday o‘ynaladi</button>
                <Link href={exitHref} className="btn-ghost flex-1">Orqaga</Link>
              </div>
            </div>
          </div>
          {top.length > 0 && (
            <div className="border-t border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">🏆 Top rekordlar</div>
              <div className="space-y-1 text-sm">
                {top.map((h, i) => <div key={h.user_id} className="flex items-center gap-2"><span className="w-5 text-ink-400">{i + 1}.</span><span>{h.profile?.avatar}</span><span className="flex-1 truncate">{h.profile?.display_name ?? h.profile?.username}</span><b className="text-gold-300">{h.score}</b></div>)}
              </div>
              <Link href={`/leaderboard?tab=games&game=${key}`} className="mt-2 block text-xs text-ember-300">To‘liq jadval →</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'end' && result) {
    const acc = result.total ? Math.round((result.correct / result.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-xl animate-pop">
        <Confetti run={Boolean(rank?.best && (best ?? 0) > 0) || acc >= 90} />
        <div className="card p-6 text-center">
          <div className="text-5xl">{rank?.best && result.score > 0 ? '🏅' : acc >= 70 ? '🎉' : '💪'}</div>
          <h2 className="title mt-2">{rank?.best && result.score > 0 ? 'Yangi rekord!' : acc >= 70 ? 'Zo‘r!' : 'Davom eting!'}</h2>
          <div className="mt-5 flex items-center justify-center gap-6">
            <ProgressRing value={acc} color={acc >= 70 ? '#2fd1bc' : '#ff6a2a'}><div><div className="font-display text-xl font-bold">{result.score}</div><div className="text-[10px] text-ink-400">ball</div></div></ProgressRing>
            <div className="text-left text-sm">
              <div className="font-display text-3xl font-bold text-ember-400">+{result.xp} XP</div>
              <div className="text-ink-300">{result.correct}/{result.total} to‘g‘ri · {acc}%</div>
              {rank && <div className="text-ink-300">Reyting: #{rank.rank}{best !== null ? ` · rekord ${best}` : ''}</div>}
              {xpRes && <div className="text-xs text-ink-400">Jami {xpRes.xp} XP · Lvl {xpRes.level} · 🔥{xpRes.streak}</div>}
            </div>
          </div>
          {result.details && result.details.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">{result.details.map((d) => <div key={d.label} className="card-soft p-2"><div className="text-ink-400">{d.label}</div><div className="font-display text-lg font-bold text-white">{d.value}</div></div>)}</div>
          )}
          {result.mistakes && result.mistakes.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-left text-sm">
              <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">Xatolar ustida ishlash</div>
              {result.mistakes.slice(0, 8).map((m, i) => <div key={i} className="flex justify-between gap-3"><span className="text-white">{m.tr}</span><span className="text-ink-300">{m.uz}</span></div>)}
            </div>
          )}
          <div className="mt-6 grid gap-2">
            <button className="btn-primary" onClick={start}>Yana o‘ynash</button>
            <Link href={`/leaderboard?tab=games&game=${key}`} className="btn-secondary"><Trophy size={16} /> Rekordlar jadvali</Link>
            <Link href={exitHref} className="btn-ghost">O‘yinlar</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-xl flex-col">
      <HowToPlay id={id} title={title} steps={howTo} open={showHow} onDone={() => setShowHow(false)} />
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-ghost -ml-2 px-2 py-2" onClick={() => router.push(exitHref)}><X size={20} /></button>
        <div className="flex-1 text-sm font-semibold text-ink-200">{icon} {title}</div>
        <button className="btn-ghost px-2 py-2 text-ink-400" onClick={() => setShowHow(true)} title="Qanday o‘ynaladi"><HelpCircle size={18} /></button>
      </div>
      <div key={runKey} className={cn('flex-1', settings.features ? '' : '')}>{children(data, onEnd, { exit: () => router.push(exitHref) })}</div>
    </div>
  );
}

/** Umumiy o'yin HUD: ball, jon, vaqt */
export function Hud({ score, lives, maxLives = 3, time, combo, extra }: { score: number; lives?: number; maxLives?: number; time?: number; combo?: number; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <div className="card-soft px-3 py-1.5"><span className="text-ink-400">Ball </span><b className="font-display text-lg text-gold-300">{score}</b></div>
      {lives !== undefined && <div className="card-soft px-3 py-1.5 text-base tracking-wider">{'❤️'.repeat(lives)}<span className="opacity-25">{'❤️'.repeat(Math.max(0, maxLives - lives))}</span></div>}
      {combo !== undefined && combo >= 2 && <div className="card-soft px-3 py-1.5 text-ember-300">🔥 ×{combo}</div>}
      {extra}
      {time !== undefined && <div className={cn('ml-auto card-soft px-3 py-1.5 font-mono text-lg', time <= 10 ? 'text-rose-400 animate-pulse' : 'text-white')}>{Math.max(0, time)}s</div>}
    </div>
  );
}

/** Oddiy countdown */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [t, setT] = useState(seconds);
  const ended = useRef(false);
  useEffect(() => { setT(seconds); ended.current = false; }, [seconds]);
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setT((x) => {
      if (x <= 1) { clearInterval(iv); if (!ended.current) { ended.current = true; setTimeout(onEnd, 0); } return 0; }
      return x - 1;
    }), 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return [t, setT] as const;
}
