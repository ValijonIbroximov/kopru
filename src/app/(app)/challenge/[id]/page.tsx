'use client';
import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import BlitzEngine from '@/components/games/BlitzEngine';
import type { GameResult } from '@/components/games/GameShell';
import { fetchChallenge, submitChallengeScore, claimChallengeXp, type Challenge } from '@/lib/social';
import { fetchUserWords, fetchWords, finishSession, checkAchievements } from '@/lib/data';
import { Skeleton, Confetti, Empty } from '@/components/ui';
import type { ChoiceExercise, Word } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/i18n';

export default function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, refresh } = useProfile();
  const { push } = useToast();
  const { l, t } = useLang();
  const [c, setC] = useState<Challenge | null | undefined>(undefined);
  const [accepted, setAccepted] = useState(false);
  const [knownIds, setKnownIds] = useState<Set<number>>(new Set());
  const [words, setWords] = useState<Word[]>([]);
  const [phase, setPhase] = useState<'intro' | 'play' | 'result'>('intro');
  const [result, setResult] = useState<{ status: string; winner_id?: string | null; a?: number; b?: number } | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);
  const claimed = useRef(false);

  useEffect(() => { (async () => { const [ch, ws, uw] = await Promise.all([fetchChallenge(id), fetchWords(), fetchUserWords()]); setC(ch); setWords(ws); setKnownIds(new Set(uw.filter(w=>w.state!=='new').map(w=>w.word_id))); })(); }, [id]);

  // G'olib/mag'lub: natija tayyor bo'lsa XP ni claim qilish (birinchi o'ynagan tomon uchun)
  useEffect(() => {
    if (!c || !profile || c.status !== 'done' || claimed.current) return;
    claimed.current = true;
    claimChallengeXp(c.id).then((r) => { if (r?.ok) { push({ kind: 'xp', icon: '⚔️', title: c.winner_id === profile.id ? l({ uz: '+40 XP — chaqiriq g‘alabasi!', tr: '+40 XP — meydan okuma galibiyeti!' }) : c.winner_id ? l({ uz: '+10 XP — ishtirok uchun', tr: '+10 XP — katılım için' }) : l({ uz: '+25 XP — durang', tr: '+25 XP — berabere' }) }); refresh(); } });
  }, [c, profile, push, refresh, l]);

  if (c === undefined || !profile) return <div className="mx-auto max-w-xl"><Skeleton className="h-60" /></div>;
  if (!c) return <Empty icon="🥊" title={l({ uz: 'Chaqiriq topilmadi', tr: 'Meydan okuma bulunamadı' })} body={l({ uz: 'Havola eskirgan yoki bu chaqiriq sizga tegishli emas.', tr: 'Bağlantı eski ya da bu meydan okuma size ait değil.' })} action={<Link href="/friends?tab=challenges" className="btn-secondary">{l({ uz: 'Chaqiriqlar', tr: 'Meydan okumalar' })}</Link>} />;

  const mine = c.challenger_id === profile.id;
  const other = mine ? c.opponent : c.challenger;
  const myStored = mine ? c.challenger_score : c.opponent_score;
  const theirStored = mine ? c.opponent_score : c.challenger_score;
  const unknownCount = new Set((c.questions as ChoiceExercise[]).filter(q=>q.wordId && !knownIds.has(q.wordId)).map(q=>q.wordId)).size;
  const canPlay = c.status === 'pending' && myStored === null && new Date(c.expires_at) > new Date();

  async function onEnd(r: GameResult) {
    setMyScore(r.score);
    try {
      await finishSession(null, 'challenge', Math.max(1, Math.round(r.durationSec / 60)), false);
      const res = await submitChallengeScore(c!.id, r.score);
      setResult(res);
      if (res.status === 'done') {
        push({ kind: 'xp', icon: res.winner_id === profile!.id ? '🏆' : res.winner_id ? '😤' : '🤝', title: res.winner_id === profile!.id ? l({ uz: 'G‘alaba! +40 XP', tr: 'Galibiyet! +40 XP' }) : res.winner_id ? l({ uz: 'Mag‘lubiyat · +10 XP', tr: 'Mağlubiyet · +10 XP' }) : l({ uz: 'Durang · +25 XP', tr: 'Berabere · +25 XP' }) });
        const ach = await checkAchievements();
        for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `${l({ uz: 'Yutuq', tr: 'Başarı' })}: ${a.title}`, body: `+${a.xp} XP` });
        await refresh();
      } else push({ kind: 'success', icon: '📨', title: l({ uz: 'Natijangiz yuborildi', tr: 'Sonucunuz gönderildi' }), body: l({ uz: `${other?.display_name ?? other?.username} o‘ynagach natija keladi.`, tr: `${other?.display_name ?? other?.username} oynayınca sonuç gelir.` }) });
      setC(await fetchChallenge(c!.id));
    } catch (e) { push({ kind: 'error', title: t('error'), body: String((e as Error).message) }); }
    setPhase('result');
  }

  if (phase === 'play') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-2 text-xs text-ink-400">⚔️ {l({ uz: `Chaqiriq · ${other?.avatar} ${other?.display_name ?? other?.username} bilan · bir xil 20 savol · 60 soniya`, tr: `Meydan okuma · ${other?.avatar} ${other?.display_name ?? other?.username} ile · aynı 20 soru · 60 saniye` })}</div>
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
        <div className="text-xs uppercase tracking-wider text-ink-400">{l({ uz: 'Chaqiriq · Blitz · 20 savol', tr: 'Meydan okuma · Blitz · 20 soru' })}</div>
        <div className="mt-4 grid grid-cols-3 items-center gap-2">
          <div><div className="text-4xl">{c.challenger?.avatar}</div><div className="mt-1 truncate text-sm font-semibold text-white">{c.challenger?.display_name ?? c.challenger?.username}</div><div className="font-display text-3xl font-bold text-ember-400">{a ?? (c.challenger_id === profile.id ? (myScore ?? '?') : '?')}</div></div>
          <div className="font-display text-2xl font-bold text-ink-400">VS</div>
          <div><div className="text-4xl">{c.opponent?.avatar}</div><div className="mt-1 truncate text-sm font-semibold text-white">{c.opponent?.display_name ?? c.opponent?.username}</div><div className="font-display text-3xl font-bold text-teal-400">{b ?? (c.opponent_id === profile.id ? (myScore ?? '?') : '?')}</div></div>
        </div>
        <div className={cn('mt-5 rounded-2xl p-3 text-sm', done ? (iWon ? 'bg-gold-400/15 text-gold-200' : c.winner_id ? 'bg-rose-500/15 text-rose-200' : 'bg-white/5 text-ink-200') : 'bg-white/5 text-ink-200')}>
          {done ? (iWon ? l({ uz: '🏆 Siz yutdingiz! +40 XP', tr: '🏆 Kazandınız! +40 XP' }) : c.winner_id ? l({ uz: `😤 ${other?.display_name ?? other?.username} yutdi. +10 XP ishtirok uchun — revansh?`, tr: `😤 ${other?.display_name ?? other?.username} kazandı. Katılım için +10 XP — rövanş?` }) : l({ uz: '🤝 Durang! +25 XP', tr: '🤝 Berabere! +25 XP' }))
            : canPlay ? (mine ? l({ uz: 'Siz chaqiriqni boshladingiz — avval o‘zingiz o‘ynaysiz.', tr: 'Meydan okumayı siz başlattınız — önce siz oynarsınız.' }) : l({ uz: `${other?.display_name ?? other?.username} sizni chaqirdi! Bir xil savollar, 60 soniya.`, tr: `${other?.display_name ?? other?.username} size meydan okudu! Aynı sorular, 60 saniye.` }))
            : myStored !== null && theirStored === null ? l({ uz: `Siz ${myStored} ball to‘pladingiz. ${other?.display_name ?? other?.username} o‘ynashini kutamiz (${new Date(c.expires_at).toLocaleDateString('uz-UZ')} gacha).`, tr: `${myStored} puan topladınız. ${other?.display_name ?? other?.username} oynamasını bekliyoruz (${new Date(c.expires_at).toLocaleDateString('tr-TR')} tarihine kadar).` })
            : c.status === 'declined' ? l({ uz: 'Chaqiriq rad etildi.', tr: 'Meydan okuma reddedildi.' }) : l({ uz: 'Chaqiriq muddati o‘tdi.', tr: 'Meydan okumanın süresi doldu.' })}
        </div>
        <div className="mt-5 grid gap-2">
          {canPlay && unknownCount > 0 && <label className="card-soft flex items-start gap-3 p-3 text-left text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>{unknownCount} ta savol so‘zi hali mashq qilinmagan. Bu umumiy raqobat ekanini tushundim va qatnashaman.</span></label>}
          {canPlay && <button disabled={unknownCount > 0 && !accepted} className="btn-primary py-4 text-base" onClick={() => setPhase('play')}>⚡ {t('play')}</button>}
          {done && other && <Link href={`/u/${other.username}`} className="btn-primary">{l({ uz: 'Revansh — raqib profilida', tr: 'Rövanş — rakip profilinde' })}</Link>}
          <Link href="/friends?tab=challenges" className="btn-secondary">{l({ uz: 'Chaqiriqlar', tr: 'Meydan okumalar' })}</Link>
        </div>
      </div>
    </div>
  );
}
