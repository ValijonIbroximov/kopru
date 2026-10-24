'use client';
import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import BlitzEngine from '@/components/games/BlitzEngine';
import type { GameResult } from '@/components/games/GameShell';
import { fetchChallenge, submitChallengeScore, claimChallengeXp, type Challenge } from '@/lib/social';
import { fetchWords, finishSession, checkAchievements } from '@/lib/data';
import { Skeleton, Confetti, Empty } from '@/components/ui';
import type { ChoiceExercise, Word } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, refresh } = useProfile();
  const { push } = useToast();
  const [c, setC] = useState<Challenge | null | undefined>(undefined);
  const [words, setWords] = useState<Word[]>([]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'result'>('intro');
  const [result, setResult] = useState<{ status: string; winner_id?: string | null; a?: number; b?: number } | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const claimed = useRef(false);

  useEffect(() => { (async () => { const [ch, ws] = await Promise.all([fetchChallenge(id), fetchWords()]); setC(ch); setWords(ws); })(); }, [id]);

  // G'olib/mag'lub: natija tayyor bo'lsa XP ni claim qilish (birinchi o'ynagan tomon uchun)
  useEffect(() => {
    if (!c || !profile || c.status !== 'done' || claimed.current) return;
    claimed.current = true;
    claimChallengeXp(c.id).then((r) => { if (r?.ok) { push({ kind: 'xp', icon: '⚔️', title: c.winner_id === profile.id ? '+40 XP — chaqiriq g‘alabasi!' : c.winner_id ? '+10 XP — ishtirok uchun' : '+25 XP — durang' }); refresh(); } });
  }, [c, profile, push, refresh]);

  if (c === undefined || !profile) return <div className="mx-auto max-w-xl"><Skeleton className="h-60" /></div>;
  if (!c) return <Empty icon="🥊" title="Chaqiriq topilmadi" body="Havola eskirgan yoki bu chaqiriq sizga tegishli emas." action={<Link href="/friends?tab=challenges" className="btn-secondary">Chaqiriqlar</Link>} />;

  const mine = c.challenger_id === profile.id;
  const other = mine ? c.opponent : c.challenger;
  const myStored = mine ? c.challenger_score : c.opponent_score;
  const theirStored = mine ? c.opponent_score : c.challenger_score;
  const canPlay = c.status === 'pending' && myStored === null && new Date(c.expires_at) > new Date();

  async function onEnd(r: GameResult) {
    setMyScore(r.score);
    try {
      await finishSession(null, 'challenge', Math.max(1, Math.round(r.durationSec / 60)), false);
      const res = await submitChallengeScore(c!.id, r.score);
      setResult(res);
      if (res.status === 'done') {
        push({ kind: 'xp', icon: res.winner_id === profile!.id ? '🏆' : res.winner_id ? '😤' : '🤝', title: res.winner_id === profile!.id ? 'G‘alaba! +40 XP' : res.winner_id ? 'Mag‘lubiyat · +10 XP' : 'Durang · +25 XP' });
        const ach = await checkAchievements();
        for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `Yutuq: ${a.title}`, body: `+${a.xp} XP` });
        await refresh();
      } else push({ kind: 'success', icon: '📨', title: 'Natijangiz yuborildi', body: `${other?.display_name ?? other?.username} o‘ynagach natija keladi.` });
      setC(await fetchChallenge(c!.id));
    } catch (e) { push({ kind: 'error', title: 'Xato', body: String((e as Error).message) }); }
    setPhase('result');
  }

  if (phase === 'play') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-2 text-xs text-ink-400">⚔️ Chaqiriq · {other?.avatar} {other?.display_name ?? other?.username} bilan · bir xil 20 savol · 60 soniya</div>
        <BlitzEngine questions={c.questions as ChoiceExercise[]} seconds={60} onEnd={onEnd} mode="challenge" allWords={words} />
      </div>
    );
  }

  const a = c.challenger_score, b = c.opponent_score;
  const done = c.status === 'done';
  const iWon = done && c.winner_id === profile.id;
  const final = result ?? (done ? { status: 'done', winner_id: c.winner_id, a: a ?? undefined, b: b ?? undefined } : null);

  return (
    <div className="mx-auto max-w-xl">
      <Confetti run={Boolean(iWon || (final?.status === 'done' && final.winner_id === profile.id))} />
      <div className="card p-6 text-center">
        <div className="text-xs uppercase tracking-wider text-ink-400">Chaqiriq · Blitz · 20 savol</div>
        <div className="mt-4 grid grid-cols-3 items-center gap-2">
          <div><div className="text-4xl">{c.challenger?.avatar}</div><div className="mt-1 truncate text-sm font-semibold text-white">{c.challenger?.display_name ?? c.challenger?.username}</div><div className="font-display text-3xl font-bold text-ember-400">{a ?? (c.challenger_id === profile.id ? (myScore ?? '?') : '?')}</div></div>
          <div className="font-display text-2xl font-bold text-ink-400">VS</div>
          <div><div className="text-4xl">{c.opponent?.avatar}</div><div className="mt-1 truncate text-sm font-semibold text-white">{c.opponent?.display_name ?? c.opponent?.username}</div><div className="font-display text-3xl font-bold text-teal-400">{b ?? (c.opponent_id === profile.id ? (myScore ?? '?') : '?')}</div></div>
        </div>
        <div className={cn('mt-5 rounded-2xl p-3 text-sm', done ? (iWon ? 'bg-gold-400/15 text-gold-200' : c.winner_id ? 'bg-rose-500/15 text-rose-200' : 'bg-white/5 text-ink-200') : 'bg-white/5 text-ink-200')}>
          {done ? (iWon ? '🏆 Siz yutdingiz! +40 XP' : c.winner_id ? `😤 ${other?.display_name ?? other?.username} yutdi. +10 XP ishtirok uchun — revansh?` : '🤝 Durang! +25 XP')
            : canPlay ? (mine ? 'Siz chaqiriqni boshladingiz — avval o‘zingiz o‘ynaysiz.' : `${other?.display_name ?? other?.username} sizni chaqirdi! Bir xil savollar, 60 soniya.`)
            : myStored !== null && theirStored === null ? `Siz ${myStored} ball to‘pladingiz. ${other?.display_name ?? other?.username} o‘ynashini kutamiz (${new Date(c.expires_at).toLocaleDateString('uz-UZ')} gacha).`
            : c.status === 'declined' ? 'Chaqiriq rad etildi.' : 'Chaqiriq muddati o‘tdi.'}
        </div>
        <div className="mt-5 grid gap-2">
          {canPlay && <button className="btn-primary py-4 text-base" onClick={() => setPhase('play')}>⚡ O‘ynash</button>}
          {done && other && <Link href="/friends" className="btn-primary">Revansh — do‘stlar sahifasida</Link>}
          <Link href="/friends?tab=challenges" className="btn-secondary">Chaqiriqlar</Link>
        </div>
      </div>
    </div>
  );
}
