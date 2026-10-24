'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { SessionSummary } from '@/lib/types';
import { addXp, finishSession, checkAchievements, completeLesson, type XpResult } from '@/lib/data';
import { useProfile } from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { Confetti, ProgressRing } from '@/components/ui';
import { formatMinutes } from '@/lib/utils';

interface Props {
  summary: SessionSummary;
  sessionId: string | null;
  bonusXp?: number;           // dars/boss mukofoti
  lessonId?: number | null;   // dars bo'lsa — yakunlash
  onRetry?: () => void;
  nextHref?: string;
  nextLabel?: string;
  mistakes?: { tr: string; uz: string }[];
}

export default function SessionEnd({ summary, sessionId, bonusXp = 0, lessonId, onRetry, nextHref = '/dashboard', nextLabel = 'Bosh sahifa', mistakes = [] }: Props) {
  const { settings, refresh } = useProfile();
  const { push } = useToast();
  const [xpRes, setXpRes] = useState<XpResult | null>(null);
  const [nextLesson, setNextLesson] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const ran = useRef(false);

  const acc = summary.total ? Math.round((summary.correct / summary.total) * 100) : 100;
  const stars = acc >= 90 ? 3 : acc >= 70 ? 2 : acc >= 50 ? 1 : 0;
  const perfectBonus = summary.perfect && summary.total >= 5 ? settings.xp.perfect_bonus ?? 15 : 0;
  const passed = acc >= 60;
  const totalXp = summary.xp + (passed ? bonusXp : 0) + perfectBonus;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const minutes = Math.max(1, Math.round(summary.durationSec / 60));
      await finishSession(sessionId, summary.mode, minutes, summary.perfect);
      if (lessonId && passed) {
        const nl = await completeLesson(lessonId, acc, stars);
        setNextLesson(nl);
      }
      const r = await addXp(totalXp, lessonId ? 'lesson' : summary.mode, { lessonId, acc, perfect: summary.perfect });
      setXpRes(r);
      if (r?.leveled_up) push({ kind: 'xp', icon: '🆙', title: `${r.level}-daraja!`, body: 'Yangi darajaga ko‘tarildingiz' });
      if (r?.streak_event === 'extended' || r?.streak_event === 'start') push({ kind: 'xp', icon: '🔥', title: `${r.streak} kunlik streak`, body: r.streak_event === 'start' ? 'Boshlandi! Ertaga ham keling.' : 'Davom etyapti!' });
      if (r?.streak_event === 'freeze_used') push({ kind: 'info', icon: '🧊', title: 'Streak muzlatish ishlatildi', body: 'Bir kun o‘tkazib yubordingiz — streak saqlanib qoldi.' });
      const ach = await checkAchievements();
      for (const a of ach) push({ kind: 'achievement', icon: a.icon, title: `Yutuq: ${a.title}`, body: `+${a.xp} XP · ${a.rarity}` });
      await refresh();
      setSaved(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-xl animate-pop">
      <Confetti run={stars >= 2} />
      <div className="card p-6 text-center">
        <div className="text-5xl">{stars === 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪'}</div>
        <h2 className="title mt-2">{stars === 3 ? 'Mukammal!' : stars === 2 ? 'Zo‘r natija!' : stars === 1 ? 'Yaxshi!' : 'Davom eting!'}</h2>
        <div className="mt-1 text-2xl text-gold-400">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
        <div className="mt-5 flex items-center justify-center gap-6">
          <ProgressRing value={acc} color={acc >= 70 ? '#2fd1bc' : '#ff6a2a'}>
            <div><div className="font-display text-xl font-bold">{acc}%</div><div className="text-[10px] text-ink-400">aniqlik</div></div>
          </ProgressRing>
          <div className="text-left text-sm">
            <div className="font-display text-3xl font-bold text-ember-400">+{totalXp} XP</div>
            <div className="text-ink-300">{summary.correct}/{summary.total} to‘g‘ri · {formatMinutes(Math.max(1, Math.round(summary.durationSec / 60)))}</div>
            {bonusXp > 0 && passed && <div className="text-ink-300">+{bonusXp} dars bonusi</div>}
            {perfectBonus > 0 && <div className="text-gold-300">+{perfectBonus} mukammal bonus 💎</div>}
            {xpRes && <div className="mt-1 text-xs text-ink-400">Jami: {xpRes.xp} XP · Lvl {xpRes.level} · 🔥{xpRes.streak}</div>}
          </div>
        </div>
        {!passed && lessonId && <div className="mt-4 rounded-2xl bg-ember-500/10 p-3 text-sm text-ember-200">Darsni yakunlash uchun 60%+ kerak. Bu normal — qaytadan urinib ko‘ring, so‘zlar endi tanish!</div>}
        {mistakes.length > 0 && (
          <div className="mt-5 rounded-2xl bg-white/[0.04] p-3 text-left">
            <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">Xatolar ustida ishlash</div>
            <div className="grid gap-1 text-sm">
              {mistakes.slice(0, 8).map((m, i) => <div key={i} className="flex justify-between gap-3"><span className="text-white">{m.tr}</span><span className="text-ink-300">{m.uz}</span></div>)}
            </div>
          </div>
        )}
        <div className="mt-6 grid gap-2">
          {lessonId && nextLesson && passed && <Link href={`/learn/${nextLesson}`} className="btn-primary">Keyingi dars →</Link>}
          {onRetry && <button className={lessonId && nextLesson && passed ? 'btn-secondary' : 'btn-primary'} onClick={onRetry}>{passed ? 'Yana bir bor' : 'Qayta urinish'}</button>}
          <Link href={nextHref} className="btn-secondary">{nextLabel}</Link>
        </div>
        {!saved && <div className="mt-3 text-xs text-ink-500">saqlanmoqda…</div>}
      </div>
    </div>
  );
}
