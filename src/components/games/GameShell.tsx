'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, HelpCircle, Trophy } from 'lucide-react';
import type { Word, GrammarTopic, Lesson, LessonProgress, SessionSummary, UserWord } from '@/lib/types';
import { fetchWords, fetchGrammar, fetchLessonProgress, fetchLessons, fetchUserWords, finishSession, addXp, checkAchievements, type XpResult } from '@/lib/data';
import { buildPool, getPoolMode, setPoolMode, nextLessonId, type PoolMode } from '@/lib/wordpool';
import PoolBar from './PoolBar';
import WordPreview from './WordPreview';
import { flushGameReviews } from '@/lib/srs-client';
import { gamePool } from '@/lib/game-policy';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { Skeleton, Confetti, ProgressRing } from '@/components/ui';
import HowToPlay, { hasSeenHowTo, type HowToStep } from './HowToPlay';
import { submitScore, fetchMyBest, fetchHighScores, type HighScore } from '@/lib/social';
import { cn } from '@/lib/utils';
import { useLang, type L } from '@/lib/i18n';

export interface GameData { words: Word[]; allWords: Word[]; grammar: GrammarTopic[]; lessons: Lesson[]; progress: LessonProgress[]; userWords: UserWord[] }

export interface GameResult {
  score: number;            // o'yin bali (rekord uchun)
  correct: number;
  total: number;
  xp: number;               // beriladigan XP
  durationSec: number;
  perfect?: boolean;
  details?: { label: L; value: string | number }[];
  mistakes?: { tr: string; uz: string }[];
}

interface Props {
  id: string;                     // mode/game id (rekord kaliti)
  title: L;
  icon: string;
  desc: L;
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
  const { l, t } = useLang();
  const [data, setData] = useState<GameData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'prepare' | 'playing' | 'end'>('loading');
  const [showHow, setShowHow] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [rank, setRank] = useState<{ best: boolean; rank: number } | null>(null);
  const [xpRes, setXpRes] = useState<XpResult | null>(null);
  const [top, setTop] = useState<HighScore[]>([]);
  const [runKey, setRunKey] = useState(0);
  const [reviewFailures, setReviewFailures] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [previewWords, setPreviewWords] = useState<Word[]>([]);
  const [poolMode, setPoolModeState] = useState<PoolMode>('known');
  const key = scoreKey ?? id;
  const saving = useRef(false);
  const raw = useRef<{ allWords: Word[]; grammar: GrammarTopic[]; progress: LessonProgress[]; lessons: Lesson[]; userWords: UserWord[] } | null>(null);

  const compose = (mode: PoolMode) => {
    const r = raw.current; if (!r) return;
    const pool = gamePool(id, r.allWords, r.lessons, r.progress, r.userWords, minWords, mode);
    setData({ words: pool.words, allWords: r.allWords, grammar: r.grammar, lessons: r.lessons, progress: r.progress, userWords: r.userWords });
  };
  const changeMode = (m: PoolMode) => { setPoolMode(m); setPoolModeState(m); compose(m); };

  useEffect(() => {
    (async () => {
      const [allWords, grammar, progress, lessons, userWords, b, t] = await Promise.all([fetchWords(), fetchGrammar(), fetchLessonProgress(), fetchLessons(), fetchUserWords(), fetchMyBest(key), fetchHighScores(key, 5)]);
      raw.current = { allWords, grammar, progress, lessons, userWords };
      const mode = getPoolMode(); setPoolModeState(mode); compose(mode);
      setBest(b); setTop(t);
      setPhase('ready');
      if (!hasSeenHowTo(id)) setShowHow(true);
      // Start remains explicit so the vocabulary preflight cannot be bypassed.
    })().catch(() => setLoadError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, key, minWords, autoStart]);

  async function onEnd(r: GameResult) {
    if (saving.current) return;
    saving.current = true;
    setResult(r); setPhase('end');
    try {
      setReviewFailures(await flushGameReviews(id));
      await finishSession(null, id, Math.max(1, Math.round(r.durationSec / 60)), Boolean(r.perfect));
      const sc = await submitScore(key, r.score, { correct: r.correct, total: r.total });
      setRank({ best: sc.best, rank: sc.rank });
      if (sc.best && (sc.prev ?? 0) > 0) push({ kind: 'achievement', icon: '🏅', title: t('new_record'), body: `${r.score} (${l({ uz: 'oldingi', tr: 'önceki' })} ${sc.prev})` });
      if (r.xp > 0) {
        const xr = await addXp(r.xp, id, { score: r.score });
        setXpRes(xr);
        if (xr?.leveled_up) push({ kind: 'xp', icon: '🆙', title: l({ uz: `${xr.level}-daraja!`, tr: `${xr.level}. seviye!` }) });
        if (xr?.streak_event === 'start' || xr?.streak_event === 'extended') push({ kind: 'xp', icon: '🔥', title: l({ uz: `${xr.streak} kunlik streak`, tr: `${xr.streak} günlük seri` }) });
      }
      const ach = await checkAchievements();
      for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `${l({ uz: 'Yutuq', tr: 'Başarı' })}: ${a.title}`, body: `+${a.xp} XP` });
      setBest(Math.max(best ?? 0, r.score));
      setTop(await fetchHighScores(key, 5));
      await refresh();
    } catch { setSaveMessage('Natijani saqlash yakunlanmadi. Sahifani yangilashdan oldin statistikani tekshiring.'); } finally { saving.current = false; }
  }

  const start = () => {
    const r = raw.current; if (!r || saving.current) return;
    const pool = gamePool(id, r.allWords, r.lessons, r.progress, r.userWords, minWords, poolMode);
    if (!pool.enough) { setPhase('ready'); return; }
    const known = new Set(pool.known.map(w => w.id));
    const fresh = minWords > 0 ? pool.words.filter(w => !known.has(w.id)) : [];
    setReviewFailures(0); setSaveMessage(''); setPreviewWords(fresh); setRunKey(k=>k+1); setResult(null); setRank(null); setXpRes(null);
    setPhase(fresh.length ? 'prepare' : 'playing');
  };
  if (loadError) return <div role="alert" className="card p-6">O‘quv tarixi yuklanmadi. <Link href="/play" className="underline">O‘yinlarga qayting va qayta oching.</Link></div>;
  if (phase === 'prepare') return <WordPreview key={runKey} words={previewWords} onDone={()=>setPhase('playing')} onBack={()=>setPhase('ready')}/>;

  if (phase === 'loading' || !data) return <div className="mx-auto max-w-xl space-y-3"><Skeleton className="h-40" /><Skeleton className="h-12" /></div>;

  if (phase === 'ready') {
    const r = raw.current!;
    const pool = gamePool(id, r.allWords, r.lessons, r.progress, r.userWords, minWords, poolMode);
    const enough = pool.enough;
    return (
      <div className="mx-auto max-w-xl animate-pop">
        <HowToPlay id={id} title={title} steps={howTo} open={showHow} onDone={() => setShowHow(false)} />
        <div className="card overflow-hidden">
          <div className="relative p-6">
            <div className="absolute -right-6 -top-6 text-[120px] opacity-10 blur-[1px] select-none">{icon}</div>
            <div className="text-5xl">{icon}</div>
            <h1 className="title mt-3">{l(title)}</h1>
            <p className="subtitle mt-1">{l(desc)}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {best !== null && <span className="chip text-gold-300"><Trophy size={12} /> {t('your_record')}: {best}</span>}
              {headerExtra}
            </div>
            {minWords > 0 && <PoolBar pool={pool} mode={poolMode} onMode={changeMode} minWords={minWords} nextLesson={nextLessonId(r.lessons, r.progress)} />}
            <div className="mt-6 grid gap-2">
              <button className="btn-primary py-4 text-base" onClick={start} disabled={!enough}>{t('start')}</button>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1" onClick={() => setShowHow(true)}><HelpCircle size={16} /> {t('how_to_play')}</button>
                <Link href={exitHref} className="btn-ghost flex-1">{t('back')}</Link>
              </div>
            </div>
          </div>
          {top.length > 0 && (
            <div className="border-t border-white/[0.06] bg-white/[0.02] p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">🏆 {t('top_records')}</div>
              <div className="space-y-1 text-sm">
                {top.map((h, i) => <div key={h.user_id} className="flex items-center gap-2"><span className="w-5 text-ink-400">{i + 1}.</span><span>{h.profile?.avatar}</span><span className="flex-1 truncate">{h.profile?.display_name ?? h.profile?.username}</span><b className="text-gold-300">{h.score}</b></div>)}
              </div>
              <Link href={`/leaderboard?tab=games&game=${key}`} className="mt-2 block text-xs text-ember-300">{t('full_table')}</Link>
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
        {saveMessage && <p role="alert" className="card mb-3 p-3 text-sm text-amber-300">{saveMessage}</p>}
        {reviewFailures > 0 && <div role="alert" className="card mb-3 p-3 text-sm text-amber-300">Ayrim so‘zlar tarixi saqlanmadi.<button className="btn-secondary mt-2" onClick={async()=>setReviewFailures(await flushGameReviews(id,true))}>Qayta saqlash</button></div>}
        <Confetti run={Boolean(rank?.best && (best ?? 0) > 0) || acc >= 90} />
        <div className="card p-6 text-center">
          <div className="text-5xl">{rank?.best && result.score > 0 ? '🏅' : acc >= 70 ? '🎉' : '💪'}</div>
          <h2 className="title mt-2">{rank?.best && result.score > 0 ? t('new_record') : acc >= 70 ? t('great') : t('keep_going')}</h2>
          <div className="mt-5 flex items-center justify-center gap-6">
            <ProgressRing value={acc} color={acc >= 70 ? '#2fd1bc' : '#ff6a2a'}><div><div className="font-display text-xl font-bold">{result.score}</div><div className="text-[10px] text-ink-400">{t('points')}</div></div></ProgressRing>
            <div className="text-left text-sm">
              <div className="font-display text-3xl font-bold text-ember-400">+{result.xp} XP</div>
              <div className="text-ink-300">{result.correct}/{result.total} {t('correct')} · {acc}%</div>
              {rank && <div className="text-ink-300">{t('rank')}: #{rank.rank}{best !== null ? ` · ${t('record').toLowerCase()} ${best}` : ''}</div>}
              {xpRes && <div className="text-xs text-ink-400">{t('xp_total')} {xpRes.xp} XP · Lvl {xpRes.level} · 🔥{xpRes.streak}</div>}
            </div>
          </div>
          {result.details && result.details.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">{result.details.map((d) => <div key={typeof d.label === 'string' ? d.label : d.label.uz} className="card-soft p-2"><div className="text-ink-400">{l(d.label)}</div><div className="font-display text-lg font-bold text-white">{d.value}</div></div>)}</div>
          )}
          {result.mistakes && result.mistakes.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 text-left text-sm">
              <div className="mb-1 text-xs uppercase tracking-wider text-ink-400">{t('mistakes_work')}</div>
              {result.mistakes.slice(0, 8).map((m, i) => <div key={i} className="flex justify-between gap-3"><span className="text-white">{m.tr}</span><span className="text-ink-300">{m.uz}</span></div>)}
            </div>
          )}
          <div className="mt-6 grid gap-2">
            <button className="btn-primary" onClick={start}>{t('play_again')}</button>
            <Link href={`/leaderboard?tab=games&game=${key}`} className="btn-secondary"><Trophy size={16} /> {l({ uz: 'Rekordlar jadvali', tr: 'Rekor tablosu' })}</Link>
            <Link href={exitHref} className="btn-ghost">{t('games')}</Link>
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
        <div className="flex-1 text-sm font-semibold text-ink-200">{icon} {l(title)}</div>
        <button className="btn-ghost px-2 py-2 text-ink-400" onClick={() => setShowHow(true)} title={t('how_to_play')}><HelpCircle size={18} /></button>
      </div>
      <div key={runKey} className={cn('flex-1', settings.features ? '' : '')}>{children(data, onEnd, { exit: () => router.push(exitHref) })}</div>
    </div>
  );
}

/** Umumiy o'yin HUD: ball, jon, vaqt */
export function Hud({ score, lives, maxLives = 3, time, combo, extra }: { score: number; lives?: number; maxLives?: number; time?: number; combo?: number; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-sm">
      <div className="card-soft px-3 py-1.5"><span className="text-ink-400"><HudScoreLabel /> </span><b className="font-display text-lg text-gold-300">{score}</b></div>
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

function HudScoreLabel() { const { t } = useLang(); return <>{t('score')}</>; }
